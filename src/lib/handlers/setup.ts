import type {
  RESTAPIChannelPatchOverwrite,
  RESTAPIGuildCreateOverwrite,
  RESTPostAPIGuildChannelJSONBody,
} from "discord-api-types/v10";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import type { SlashCommandEvent } from "chat";

import {
  createGuildChannel,
  getGuildChannels,
  getGuildRoles,
  patchChannel,
} from "../discord-guild";
import { getBotUserId, getGuildId } from "../discord-options";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_ROLES,
} from "../server-template";
import { reportError, summarize } from "./shared";

/** `/setup` (administrator only) — creates the standard categories and channels when missing; `adminOnly` categories hide from `@everyone` and grant the Organizer role admin-level rights over the channels. */

/**
 * Admin-level text-channel rights granted to the Organizer role (and the bot)
 * on `adminOnly` categories: view/manage the channel and its permissions,
 * send, moderate messages, and manage threads.
 */
const ORGANIZER_ALLOW =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.ManageChannels |
  PermissionFlagsBits.ManageRoles |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.ManageThreads |
  PermissionFlagsBits.CreatePublicThreads |
  PermissionFlagsBits.CreatePrivateThreads |
  PermissionFlagsBits.SendMessagesInThreads;

/** Build the overwrites for an `adminOnly` category: deny @everyone, allow the bot, grant the Organizer role admin rights. */
function adminOnlyOverwrites(
  guildId: string,
  botUserId: string | null,
  organizerRoleId: string | null,
): RESTAPIGuildCreateOverwrite[] {
  const overwrites: RESTAPIGuildCreateOverwrite[] = [
    {
      id: guildId,
      type: OverwriteType.Role,
      deny: PermissionFlagsBits.ViewChannel.toString(),
    },
  ];

  if (organizerRoleId) {
    overwrites.push({
      id: organizerRoleId,
      type: OverwriteType.Role,
      allow: ORGANIZER_ALLOW.toString(),
    });
  }

  if (botUserId) {
    overwrites.push({
      id: botUserId,
      type: OverwriteType.Member,
      allow: ORGANIZER_ALLOW.toString(),
    });
  }

  return overwrites;
}

/** Whether a channel's existing overwrites already grant the Organizer role channel-admin rights. */
export function hasOrganizerOverwrite(
  overwrites: { id: string; allow?: string }[] | undefined,
  organizerRoleId: string,
): boolean {
  const entry = overwrites?.find((overwrite) => overwrite.id === organizerRoleId);
  if (!entry?.allow) {
    return false;
  }
  try {
    return (BigInt(entry.allow) & ORGANIZER_ALLOW) === ORGANIZER_ALLOW;
  } catch {
    return false;
  }
}

/** OR two permission bitfields; returns undefined when the result is zero. */
function orBits(a?: string | null, b?: string | null): string | undefined {
  let result = 0n;
  for (const value of [a, b]) {
    if (!value) {
      continue;
    }
    try {
      result |= BigInt(value);
    } catch {
      // Malformed bitfield — ignore it rather than failing the merge.
    }
  }
  return result === 0n ? undefined : result.toString();
}

/**
 * Merge the `adminOnly` overwrites into a channel's existing overwrites.
 * PATCH replaces the full list, so union each matching entry's allow/deny
 * bits to keep any manual permission tweaks the server admins made.
 */
export function withOrganizerOverwrites(
  existing:
    | { id: string; type: number; allow?: string; deny?: string }[]
    | undefined,
  guildId: string,
  botUserId: string | null,
  organizerRoleId: string | null,
): RESTAPIChannelPatchOverwrite[] {
  const desired = adminOnlyOverwrites(guildId, botUserId, organizerRoleId);
  const merged = new Map<string, RESTAPIChannelPatchOverwrite>();
  for (const overwrite of existing ?? []) {
    merged.set(String(overwrite.id), {
      id: String(overwrite.id),
      type: overwrite.type as OverwriteType,
      ...(overwrite.allow !== undefined ? { allow: overwrite.allow } : {}),
      ...(overwrite.deny !== undefined ? { deny: overwrite.deny } : {}),
    });
  }
  for (const overwrite of desired) {
    const key = String(overwrite.id);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...overwrite, id: key });
      continue;
    }
    const allow = orBits(current.allow, overwrite.allow);
    const deny = orBits(current.deny, overwrite.deny);
    merged.set(key, {
      id: key,
      type: current.type,
      ...(allow !== undefined ? { allow } : {}),
      ...(deny !== undefined ? { deny } : {}),
    });
  }
  return [...merged.values()];
}

export async function handleSetup(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  const botUserId = getBotUserId(event);

  let existing;
  try {
    existing = await getGuildChannels(guildId);
  } catch (error) {
    await reportError(event, "Couldn't read this server's channels", error);
    return;
  }

  // Resolve the Organizer role so `adminOnly` categories can grant it
  // channel-admin rights. Warn (but continue) when it is missing.
  let organizerRoleId: string | null = null;
  let missingOrganizerRole = false;
  try {
    const roles = await getGuildRoles(guildId);
    const organizerName = TEMPLATE_ROLES.find(
      (role) => role.key === "organizer",
    )?.name.toLowerCase();
    organizerRoleId =
      roles.find(
        (role) => role.name.toLowerCase() === organizerName,
      )?.id ?? null;
    missingOrganizerRole = organizerRoleId === null;
  } catch (error) {
    await reportError(event, "Couldn't read this server's roles", error);
    return;
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const repaired: string[] = [];

  for (const category of TEMPLATE_CATEGORIES) {
    const overwrites = category.adminOnly
      ? adminOnlyOverwrites(guildId, botUserId, organizerRoleId)
      : undefined;

    let categoryId: string;
    const existingCategory = existing.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === category.name.toLowerCase(),
    );

    if (existingCategory) {
      categoryId = existingCategory.id;
      if (
        category.adminOnly &&
        organizerRoleId &&
        !hasOrganizerOverwrite(
          existingCategory.permission_overwrites,
          organizerRoleId,
        )
      ) {
        try {
          await patchChannel(existingCategory.id, {
            permission_overwrites: withOrganizerOverwrites(
              existingCategory.permission_overwrites,
              guildId,
              botUserId,
              organizerRoleId,
            ),
          });
          repaired.push(category.name);
        } catch (error) {
          await reportError(
            event,
            `Couldn't update permissions for the ${category.name} category`,
            error,
          );
          return;
        }
      } else {
        skipped.push(category.name);
      }
    } else {
      try {
        const createdCategory = await createGuildChannel(guildId, {
          name: category.name,
          type: ChannelType.GuildCategory,
          position: existing.length,
          permission_overwrites: overwrites,
        });
        categoryId = createdCategory.id;
        created.push(category.name);
      } catch (error) {
        await reportError(
          event,
          `Couldn't create the ${category.name} category`,
          error,
        );
        return;
      }
    }

    for (const channel of category.channels) {
      const existingChannel = existing.find(
        (candidate) =>
          candidate.parent_id === categoryId &&
          candidate.name.toLowerCase() === channel.name.toLowerCase(),
      );
      if (existingChannel) {
        if (
          category.adminOnly &&
          organizerRoleId &&
          !hasOrganizerOverwrite(
            existingChannel.permission_overwrites,
            organizerRoleId,
          )
        ) {
          try {
            await patchChannel(existingChannel.id, {
              permission_overwrites: withOrganizerOverwrites(
                existingChannel.permission_overwrites,
                guildId,
                botUserId,
                organizerRoleId,
              ),
            });
            repaired.push(`#${channel.name}`);
          } catch (error) {
            await reportError(
              event,
              `Couldn't update permissions for #${channel.name}`,
              error,
            );
            return;
          }
        } else {
          skipped.push(`#${channel.name}`);
        }
        continue;
      }

      try {
        const body: RESTPostAPIGuildChannelJSONBody = {
          name: channel.name,
          type: channel.type,
          parent_id: categoryId,
          permission_overwrites: overwrites,
        };
        await createGuildChannel(guildId, body);
        created.push(`#${channel.name}`);
      } catch (error) {
        await reportError(event, `Couldn't create #${channel.name}`, error);
        return;
      }
    }
  }

  const lines = [summarize("Server setup", created, skipped)];
  if (repaired.length > 0) {
    lines.push(
      `🔧 Permissions updated: ${repaired.map((name) => `\`${name}\``).join(", ")}`,
    );
  }
  if (missingOrganizerRole) {
    lines.push(
      "⚠️ The `Organizer` role doesn't exist yet — run `/roles` so the organizers channel can grant it admin rights.",
    );
  }
  await event.channel.post(lines.join("\n"));
}
