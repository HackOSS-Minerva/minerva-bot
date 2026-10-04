import type {
  RESTAPIGuildCreateOverwrite,
  RESTPostAPIGuildChannelJSONBody,
} from "discord-api-types/v10";
import { ChannelType, OverwriteType } from "discord-api-types/v10";
import type { SlashCommandEvent } from "chat";

import { createGuildChannel, getGuildChannels } from "../discord-guild";
import { getBotUserId, getGuildId } from "../discord-options";
import { TEMPLATE_CATEGORIES } from "../server-template";
import { reportError, summarize } from "./shared";

/** `/setup` (administrator only) — creates the standard categories and channels when missing; `adminOnly` categories deny `@everyone` `ViewChannel`. */

/** ViewChannel permission bit. discord-api-types v10 has no PermissionFlagsBits map. */
const VIEW_CHANNEL = 1n << 10n;

/** Deny @everyone, allow the bot itself. */
function adminOnlyOverwrites(
  guildId: string,
  botUserId: string | null,
): RESTAPIGuildCreateOverwrite[] {
  const overwrites: RESTAPIGuildCreateOverwrite[] = [
    { id: guildId, type: OverwriteType.Role, deny: VIEW_CHANNEL.toString() },
  ];

  if (botUserId) {
    overwrites.push({
      id: botUserId,
      type: OverwriteType.Member,
      allow: VIEW_CHANNEL.toString(),
    });
  }

  return overwrites;
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

  const created: string[] = [];
  const skipped: string[] = [];

  for (const category of TEMPLATE_CATEGORIES) {
    const overwrites = category.adminOnly
      ? adminOnlyOverwrites(guildId, botUserId)
      : undefined;

    let categoryId: string;
    const existingCategory = existing.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === category.name.toLowerCase(),
    );

    if (existingCategory) {
      categoryId = existingCategory.id;
      skipped.push(category.name);
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
      const alreadyExists = existing.some(
        (existingChannel) =>
          existingChannel.parent_id === categoryId &&
          existingChannel.name.toLowerCase() === channel.name.toLowerCase(),
      );
      if (alreadyExists) {
        skipped.push(`#${channel.name}`);
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

  await event.channel.post(summarize("Server setup", created, skipped));
}
