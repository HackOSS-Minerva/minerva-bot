import type { SlashCommandEvent } from "chat";

import { addGuildMemberRole, getGuildRoles } from "../discord-guild";
import {
  getGuildId,
  getInvokingUserId,
  getStringOption,
  getUserOption,
  isAdministrator,
} from "../discord-options";
import { TEMPLATE_ROLES } from "../server-template";
import { reportError } from "./shared";

/** `/assign [user] <hacker|judge|mentor>` — members self-serve a template role; assigning to somebody else requires Administrator. */
export async function handleAssign(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  const roleKey = (getStringOption(event.raw, "role") ?? "").toLowerCase();
  const templateRole = TEMPLATE_ROLES.find((role) => role.key === roleKey);
  if (!templateRole) {
    await event.channel.post("Pick a role: hacker, judge, or mentor.");
    return;
  }

  const target = getUserOption(event.raw, "user");
  const invokingUserId = getInvokingUserId(event.raw);
  if (!invokingUserId) {
    await event.channel.post("Couldn't determine who ran this command.");
    return;
  }

  // Assigning to someone else is administrator-only.
  if (target && !isAdministrator(event.raw)) {
    await event.channel.post(
      "Only administrators can assign roles to other members.",
    );
    return;
  }

  const targetUserId = target?.id ?? invokingUserId;

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
      `The **${templateRole.name}** role doesn't exist yet. An administrator can run \`/roles\` to create it.`,
    );
    return;
  }

  try {
    await addGuildMemberRole(guildId, targetUserId, role.id);
  } catch (error) {
    await reportError(event, `Couldn't assign the ${role.name} role`, error);
    return;
  }

  await event.channel.post(
    target
      ? `Gave <@${target.id}> the **${role.name}** role.`
      : `You now have the **${role.name}** role.`,
  );
}
