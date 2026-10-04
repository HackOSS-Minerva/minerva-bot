import type { SlashCommandEvent } from "chat";

import { addGuildMemberRole, getGuildRoles } from "../discord-guild";
import { getGuildId, getInvokingUserId, getStringOption } from "../discord-options";
import { SELF_ASSIGNABLE_ROLES } from "../server-template";
import { reportError } from "./shared";

/** `/assign <hacker|judge|mentor>` — members self-serve a template role; always assigns to the invoking user. Organizer is admin-only via `/autoassign`. */
export async function handleAssign(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  const roleKey = (getStringOption(event.raw, "role") ?? "").toLowerCase();
  const templateRole = SELF_ASSIGNABLE_ROLES.find((role) => role.key === roleKey);
  if (!templateRole) {
    await event.channel.post("Pick a role: hacker, judge, or mentor.");
    return;
  }

  const invokingUserId = getInvokingUserId(event.raw);
  if (!invokingUserId) {
    await event.channel.post("Couldn't determine who ran this command.");
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
    (candidate) => candidate.name.toLowerCase() === templateRole.name.toLowerCase(),
  );
  if (!role) {
    await event.channel.post(
      `The **${templateRole.name}** role doesn't exist yet. An administrator can run \`/roles\` to create it.`,
    );
    return;
  }

  try {
    await addGuildMemberRole(guildId, invokingUserId, role.id);
  } catch (error) {
    await reportError(event, `Couldn't assign the ${role.name} role`, error);
    return;
  }

  await event.channel.post(`You now have the **${role.name}** role.`);
}
