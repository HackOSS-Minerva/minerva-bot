import type { SlashCommandEvent } from "chat";

import { addGuildMemberRole, getGuildRoles } from "../discord-guild";
import {
  getGuildId,
  getStringOption,
  getUserOption,
  isAdministrator,
} from "../discord-options";
import { TEMPLATE_ROLES } from "../server-template";
import { reportError } from "./shared";

/** `/autoassign <user> <hacker|organizer|judge|mentor>` (administrator only) — assigns a template role to any member. */
export async function handleAutoAssign(
  event: SlashCommandEvent,
): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  if (!isAdministrator(event.raw)) {
    await event.channel.post("Only administrators can use /autoassign.");
    return;
  }

  const target = getUserOption(event.raw, "user");
  if (!target) {
    await event.channel.post("Mention the member to assign the role to.");
    return;
  }

  const roleKey = (getStringOption(event.raw, "role") ?? "").toLowerCase();
  const templateRole = TEMPLATE_ROLES.find((role) => role.key === roleKey);
  if (!templateRole) {
    await event.channel.post(
      "Pick a role: hacker, organizer, judge, or mentor.",
    );
    return;
  }

  let roles;
  try {
    roles = await getGuildRoles(guildId);
  } catch (error) {
    await reportError(event, "Couldn't read this server's roles", error);
    return;
  }

  const role = roles.find(
    (candidate) =>
      candidate.name.toLowerCase() === templateRole.name.toLowerCase(),
  );
  if (!role) {
    await event.channel.post(
      `The **${templateRole.name}** role doesn't exist yet. Run \`/roles\` to create it.`,
    );
    return;
  }

  try {
    await addGuildMemberRole(guildId, target.id, role.id);
  } catch (error) {
    await reportError(event, `Couldn't assign the ${role.name} role`, error);
    return;
  }

  await event.channel.post(`Gave <@${target.id}> the **${role.name}** role.`);
}
