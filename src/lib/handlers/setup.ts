import type {
  RESTAPIChannelPatchOverwrite,
  RESTAPIGuildCreateOverwrite,
  RESTGetAPIGuildChannelsResult,
  RESTPostAPIGuildChannelJSONBody,
} from "discord-api-types/v10";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import type { SlashCommandEvent } from "chat";

import {
  createChannelMessage,
  createGuildChannel,
  deleteGuildChannel,
  getGuildChannels,
  getGuildRoles,
  patchChannel,
} from "../discord-guild";
import { getBotUserId, getGuildId } from "../discord-options";
import { errorMessage } from "../discord-rest";
import {
  categoryLabel,
  channelTopic,
  TEMPLATE_CATEGORIES,
  TEMPLATE_ROLES,
  type TemplateCategory,
} from "../server-template";
/**
 * `/setup` (administrator only) — DESTRUCTIVE: requires the template roles to
 * exist (run `/roles` first; stops and says so when any are missing), then
 * deletes every existing channel and category in the server before rebuilding
 * the standard structure from the template. `adminOnly` categories hide from
 * `@everyone` and grant the Organizer role admin-level rights over the
 * channels.
 *
 * Posts a public warning before wiping, then a per-category summary (what was
 * deleted, what could not be deleted, new categories/channels, what already
 * existed, which permissions were repaired). Because the wipe may delete the
 * channel the command ran in, every reply falls back to the server's
 * `#general` when the original channel is gone.
 */

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

/** Outcome for one template category during a `/setup` run. */
interface CategoryResult {
  /** Template category name. */
  name: string;
  /** How the category itself fared: created, permissions repaired, or already in place. */
  category: "created" | "repaired" | "existing";
  /** Channel names (without `#`) created under the category. */
  created: string[];
  /** Channel names (without `#`) that already existed. */
  existing: string[];
  /** Channel names (without `#`) whose Organizer permissions were repaired. */
  repaired: string[];
}

/** Render one summary row, e.g. `• **organizers** (category): \`#general\`, \`#system-logs\``. */
function categoryLine(
  name: string,
  includeCategory: boolean,
  channels: string[],
): string {
  const label = includeCategory ? `**${name}** (category)` : `**${name}**`;
  const list = channels.map((channel) => `\`#${channel}\``).join(", ");
  return list ? `• ${label}: ${list}` : `• ${label}`;
}

/**
 * Build the public `/setup` summary. Channels are grouped under their category
 * (instead of one long comma-separated list) so the result is easy to scan.
 */
function summarizeSetup(
  results: CategoryResult[],
  wipe?: WipeResult,
): string {
  const count = (pick: (result: CategoryResult) => number): number =>
    results.reduce((total, result) => total + pick(result), 0);

  const newCategories = results.filter(
    (result) => result.category === "created",
  );
  const repairedCategories = results.filter(
    (result) => result.category === "repaired",
  );
  const withNewChannels = results.filter((result) => result.created.length > 0);
  const untouched = results.filter(
    (result) => result.category === "existing" || result.existing.length > 0,
  );
  const repaired = results.filter(
    (result) => result.category === "repaired" || result.repaired.length > 0,
  );

  const newChannelCount = count((result) => result.created.length);
  const untouchedCount =
    results.filter((result) => result.category === "existing").length +
    count((result) => result.existing.length);
  const repairedCount =
    repairedCategories.length + count((result) => result.repaired.length);

  // No "complete ✅" banner: the summary now goes straight to the facts, and a
  // completion header read as a verdict on a run that may only have partly
  // succeeded (undeletable channels are reported as failures below).
  const lines: string[] = [];

  /** Start a new section, separated from the previous one by a blank line. */
  const section = (heading: string) => {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(heading);
  };

  if (wipe) {
    lines.push(`🗑️ **Deleted first:** ${wipe.deleted} channels and categories`);
    if (wipe.survivors.length > 0) {
      lines.push(
        `⚠️ **Could not delete (${wipe.survivors.length}), left in place:** ${wipe.survivors
          .map(labelChannel)
          .join(", ")}`,
      );
    }
  }

  if (
    newCategories.length === 0 &&
    newChannelCount === 0 &&
    repairedCount === 0
  ) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(
      untouchedCount > 0
        ? `Nothing to create — this server already matches the template (${untouchedCount} categories/channels in place).`
        : "Nothing to do.",
    );
    return lines.join("\n");
  }

  if (newCategories.length > 0) {
    section(
      `🆕 **New categories (${newCategories.length}):** ${newCategories
        .map((result) => result.name)
        .join(", ")}`,
    );
  }

  if (withNewChannels.length > 0) {
    section(`✅ **New channels (${newChannelCount}):**`);
    for (const result of withNewChannels) {
      lines.push(categoryLine(result.name, false, result.created));
    }
  }

  if (untouched.length > 0) {
    section("**The following channels already exist:**");
    for (const result of untouched) {
      lines.push(
        categoryLine(
          result.name,
          result.category === "existing",
          result.existing,
        ),
      );
    }
  }

  if (repaired.length > 0) {
    section(`🔧 **Updated (${repairedCount}):**`);
    for (const result of repaired) {
      lines.push(
        categoryLine(
          result.name,
          result.category === "repaired",
          result.repaired,
        ),
      );
    }
  }

  return lines.join("\n");
}

/** Outcome of the destructive wipe that every `/setup` run starts with. */
interface WipeResult {
  /** Channels and categories whose deletion failed — they stay in place. */
  survivors: RESTGetAPIGuildChannelsResult;
  /** How many channels and categories were deleted. */
  deleted: number;
}

/** Label a channel for messages: `#name` for channels, plain `name` for categories. */
function labelChannel(channel: RESTGetAPIGuildChannelsResult[number]): string {
  const name = channel.name ?? channel.id;
  return channel.type === ChannelType.GuildCategory ? name : `#${name}`;
}

/**
 * Whether an existing category name matches a template category.
 *
 * Matches the current emoji-decorated label (`🔵 Info Desk`) and also the bare
 * `Info Desk`, so a server set up before emojis were introduced is adopted
 * rather than duplicated.
 */
function matchesCategoryName(actual: string | null | undefined, category: TemplateCategory): boolean {
  const candidates = [categoryLabel(category), category.name];
  return candidates.some(
    (candidate) => actual?.toLowerCase() === candidate.toLowerCase(),
  );
}

/**
 * A channel's topic, or `null` when the channel type has none.
 *
 * `APIGuildChannel` is a union whose base type omits `topic`, so it is read off
 * the subtypes that actually carry it rather than cast across the whole union.
 */
function channelTopicOf(
  channel: RESTGetAPIGuildChannelsResult[number],
): string | null {
  return "topic" in channel && typeof channel.topic === "string"
    ? channel.topic
    : null;
}

/** Strip a leading run of non-alphanumeric characters (emoji, pipes, spaces) from a name. */
function stripDecoration(name: string): string {
  return name
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
}

/**
 * Whether an existing channel name matches a template channel.
 *
 * Channel names are plain (`rules`) because Discord strips emoji from them, but
 * this tolerates a decorated name in case a server was hand-edited, and ignores
 * case since Discord lowercases text channel names.
 */
function matchesChannelName(actual: string | null | undefined, name: string): boolean {
  if (!actual) {
    return false;
  }
  const lowered = actual.toLowerCase();
  return lowered === name.toLowerCase() || stripDecoration(lowered) === name.toLowerCase();
}

/**
 * Delete every channel and category in the server: plain channels first so no
 * category is removed while it still has children, then the categories.
 * Failures are collected instead of thrown — one undeletable channel must not
 * abort the rebuild.
 */
async function wipeGuildChannels(
  channels: RESTGetAPIGuildChannelsResult,
): Promise<WipeResult> {
  const deletedIds = new Set<string>();
  const categories = channels.filter(
    (channel) => channel.type === ChannelType.GuildCategory,
  );
  const others = channels.filter(
    (channel) => channel.type !== ChannelType.GuildCategory,
  );

  for (const channel of [...others, ...categories]) {
    try {
      await deleteGuildChannel(channel.id);
      deletedIds.add(channel.id);
    } catch {
      // Keep going; the survivor is reported in the summary.
    }
  }

  return {
    survivors: channels.filter((channel) => !deletedIds.has(channel.id)),
    deleted: deletedIds.size,
  };
}

/**
 * Channel the `/setup` summary is delivered to.
 *
 * `/setup` wipes every channel before rebuilding, so the channel the command
 * ran in is normally gone by the time the summary is ready. The summary is an
 * admin-facing record of a destructive rebuild, so it goes to the template's
 * `#system-logs` inside the `adminOnly` organizers category rather than a
 * public channel — falling back to `#general`, then to any text channel, so the
 * outcome is never silently lost.
 */
async function findFallbackChannel(
  guildId: string,
): Promise<{ id: string; name: string } | null> {
  const channels = await getGuildChannels(guildId);
  const textChannels = channels.filter(
    (channel) => channel.type === ChannelType.GuildText,
  );

  // Derive the target from the template instead of hardcoding names, so this
  // keeps tracking `TEMPLATE_CATEGORIES` if either is renamed.
  const logsCategory = TEMPLATE_CATEGORIES.find(
    (category) => category.name === "organizers",
  );
  const logsChannel = logsCategory?.channels.find(
    (channel) => channel.name === "system-logs",
  );
  const logsName = logsChannel?.name ?? "system-logs";
  const generalName =
    TEMPLATE_CATEGORIES.find((category) => category.name === "general")?.channels.find(
      (channel) => channel.name === "general",
    )?.name ?? "general";

  // Categories carry an emoji prefix, so match on the bare template name.
  const logsCategoryOnDiscord = logsCategory
    ? channels.find(
        (channel) =>
          channel.type === ChannelType.GuildCategory &&
          matchesCategoryName(channel.name, logsCategory),
      )
    : undefined;

  const inCategory = (channel: RESTGetAPIGuildChannelsResult[number]) =>
    !logsCategoryOnDiscord || channel.parent_id === logsCategoryOnDiscord.id;

  const preferred =
    textChannels.find(
      (channel) => matchesChannelName(channel.name, logsName) && inCategory(channel),
    ) ??
    textChannels.find((channel) => matchesChannelName(channel.name, generalName)) ??
    textChannels[0];

  return preferred
    ? { id: preferred.id, name: preferred.name ?? logsName }
    : null;
}

/**
 * Post a message where the command ran. `/setup` deletes that channel before it
 * rebuilds, so when the reply fails the message is redirected to
 * `#system-logs` — appending `fallbackNote` — so the outcome is still visible.
 */
async function post(
  event: SlashCommandEvent,
  guildId: string,
  text: string,
  fallbackNote?: string,
): Promise<void> {
  try {
    await event.channel.post(text);
    return;
  } catch {
    // The invocation channel was most likely deleted by this run.
  }

  try {
    const fallback = await findFallbackChannel(guildId);
    if (fallback) {
      await createChannelMessage(
        fallback.id,
        fallbackNote ? `${text}\n\n${fallbackNote}` : text,
      );
    }
  } catch {
    // Nothing else we can do — the reply is lost.
  }
}

/** Post a failure notice wherever the summary will land. */
async function reportFailure(
  event: SlashCommandEvent,
  guildId: string,
  context: string,
  error: unknown,
): Promise<void> {
  await post(event, guildId, `${context}: ${errorMessage(error)}`);
}

export async function handleSetup(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  const botUserId = getBotUserId(event);

  // `/setup` builds on the template roles, so require `/roles` to have run first.
  let roles;
  try {
    roles = await getGuildRoles(guildId);
  } catch (error) {
    await reportFailure(
      event,
      guildId,
      "Couldn't read this server's roles",
      error,
    );
    return;
  }

  const existingRoleNames = new Set(
    roles.map((role) => role.name.toLowerCase()),
  );
  const missingRoles = TEMPLATE_ROLES.filter(
    (templateRole) => !existingRoleNames.has(templateRole.name.toLowerCase()),
  );
  if (missingRoles.length > 0) {
    const missing = missingRoles.map((role) => `**${role.name}**`).join(", ");
    await post(
      event,
      guildId,
      [
        "**Almost there — this server is missing a few roles**",
        "",
        `These roles don't exist yet: ${missing}.`,
        "Run `/roles` first to create them, then run `/setup` again.",
      ].join("\n"),
    );
    return;
  }

  // Resolve the Organizer role so `adminOnly` categories can grant it
  // channel-admin rights. The gate above guarantees it exists.
  const organizerName = TEMPLATE_ROLES.find(
    (role) => role.key === "organizer",
  )?.name.toLowerCase();
  const organizerRoleId =
    roles.find((role) => role.name.toLowerCase() === organizerName)?.id ?? null;

  let existing;
  try {
    existing = await getGuildChannels(guildId);
  } catch (error) {
    await reportFailure(
      event,
      guildId,
      "Couldn't read this server's channels",
      error,
    );
    return;
  }

  // Acknowledge the interaction first (Discord expects a response within a few
  // seconds), then wipe the server so the template can be rebuilt from scratch.
  await post(
    event,
    guildId,
    [
      "⚠️ **Destructive operation — this server is being rebuilt from scratch.**",
      "",
      existing.length > 0
        ? `Deleting all ${existing.length} existing channels and categories, then recreating the standard template. This can't be undone.`
        : "Recreating the standard template from scratch. This can't be undone.",
    ].join("\n"),
  );

  const wipe = await wipeGuildChannels(existing);
  existing = wipe.survivors;
  let nextPosition = existing.length;

  const results: CategoryResult[] = [];

  for (const category of TEMPLATE_CATEGORIES) {
    const result: CategoryResult = {
      name: category.name,
      category: "existing",
      created: [],
      existing: [],
      repaired: [],
    };
    results.push(result);

    const overwrites = category.adminOnly
      ? adminOnlyOverwrites(guildId, botUserId, organizerRoleId)
      : undefined;

    let categoryId: string;
    const existingCategory = existing.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        matchesCategoryName(channel.name, category),
    );

    if (existingCategory) {
      categoryId = existingCategory.id;

      // Adopted categories may predate the emoji prefix; bring the name and the
      // Organizer overwrites up to date in a single PATCH.
      const wantsRename = existingCategory.name !== categoryLabel(category);
      const needsPermissions = Boolean(
        category.adminOnly &&
          organizerRoleId &&
          !hasOrganizerOverwrite(
            existingCategory.permission_overwrites,
            organizerRoleId,
          ),
      );

      if (wantsRename || needsPermissions) {
        try {
          await patchChannel(existingCategory.id, {
            ...(wantsRename ? { name: categoryLabel(category) } : {}),
            ...(needsPermissions
              ? {
                  permission_overwrites: withOrganizerOverwrites(
                    existingCategory.permission_overwrites,
                    guildId,
                    botUserId,
                    organizerRoleId,
                  ),
                }
              : {}),
          });
          result.category = "repaired";
        } catch (error) {
          await reportFailure(
            event,
            guildId,
            `Couldn't update the ${category.name} category`,
            error,
          );
          return;
        }
      }
    } else {
      try {
        const createdCategory = await createGuildChannel(guildId, {
          name: categoryLabel(category),
          type: ChannelType.GuildCategory,
          position: nextPosition++,
          permission_overwrites: overwrites,
        });
        categoryId = createdCategory.id;
        result.category = "created";
      } catch (error) {
        await reportFailure(
          event,
          guildId,
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
          matchesChannelName(candidate.name, channel.name),
      );
      if (existingChannel) {
        const wantsTopic = channelTopicOf(existingChannel) !== channelTopic(channel);
        const needsPermissions = Boolean(
          category.adminOnly &&
            organizerRoleId &&
            !hasOrganizerOverwrite(
              existingChannel.permission_overwrites,
              organizerRoleId,
            ),
        );

        if (wantsTopic || needsPermissions) {
          try {
            await patchChannel(existingChannel.id, {
              ...(wantsTopic ? { topic: channelTopic(channel) } : {}),
              ...(needsPermissions
                ? {
                    permission_overwrites: withOrganizerOverwrites(
                      existingChannel.permission_overwrites,
                      guildId,
                      botUserId,
                      organizerRoleId,
                    ),
                  }
                : {}),
            });
            result.repaired.push(channel.name);
          } catch (error) {
            await reportFailure(
              event,
              guildId,
              `Couldn't update #${channel.name}`,
              error,
            );
            return;
          }
        } else {
          result.existing.push(channel.name);
        }
        continue;
      }

      try {
        const body: RESTPostAPIGuildChannelJSONBody = {
          name: channel.name,
          type: channel.type,
          parent_id: categoryId,
          permission_overwrites: overwrites,
          topic: channelTopic(channel),
        };
        await createGuildChannel(guildId, body);
        result.created.push(channel.name);
      } catch (error) {
        await reportFailure(
          event,
          guildId,
          `Couldn't create #${channel.name}`,
          error,
        );
        return;
      }
    }
  }

  await post(
    event,
    guildId,
    summarizeSetup(results, wipe),
    "↳ Posted here because the channel you ran `/setup` in was deleted.",
  );
}
