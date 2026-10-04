import type { SlashCommandEvent } from "chat";

import { createGuildRole, getGuildRoles } from "../discord-guild";
import { getGuildId } from "../discord-options";
import { TEMPLATE_ROLES } from "../server-template";
import { reportError, summarize } from "./shared";

/** `/roles` (administrator only) — creates the standard roles when missing; safe to run repeatedly. */
export async function handleRoles(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  let existing;
  try {
    existing = await getGuildRoles(guildId);
  } catch (error) {
    await reportError(event, "Couldn't read this server's roles", error);
    return;
  }

  const existingNames = new Set(
    existing.map((role) => role.name.toLowerCase()),
  );
  const created: string[] = [];
  const skipped: string[] = [];

  for (const templateRole of TEMPLATE_ROLES) {
    if (existingNames.has(templateRole.name.toLowerCase())) {
      skipped.push(templateRole.name);
      continue;
    }

    try {
      await createGuildRole(guildId, {
        name: templateRole.name,
        color: templateRole.color,
        hoist: templateRole.hoist,
        mentionable: templateRole.mentionable,
      });
      created.push(templateRole.name);
    } catch (error) {
      await reportError(
        event,
        `Couldn't create the ${templateRole.name} role`,
        error,
      );
      return;
    }
  }

  await event.channel.post(summarize("Role setup", "roles", created, skipped));
}
