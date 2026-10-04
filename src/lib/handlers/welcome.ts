import type { SlashCommandEvent } from "chat";

import { getGuildId } from "../discord-options";
import { getTenantByServerId } from "../tenants";

/** `/welcome` — resolves the caller's server ID to its `tenants.json` tenant and greets that hackathon. */
export async function handleWelcome(event: SlashCommandEvent): Promise<void> {
  const guildId = getGuildId(event.raw);
  if (!guildId) {
    await event.channel.post("This command can only be used in a server.");
    return;
  }

  const tenant = getTenantByServerId(guildId);
  if (!tenant) {
    await event.channel.post(
      `Hello! All systems are operational! ✅\nThis server (\`${guildId}\`) isn't mapped to a hackathon yet — add it to \`tenants.json\` to get a personalized greeting.`,
    );
    return;
  }

  await event.channel.post(
    `Hello ${tenant.name}! 👋 All systems are operational! ✅`,
  );
}
