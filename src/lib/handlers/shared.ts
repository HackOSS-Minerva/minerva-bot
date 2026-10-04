import type { SlashCommandEvent } from "chat";

import { errorMessage } from "../discord-rest";

/** Post a short failure notice to the channel where the command ran. */
export async function reportError(
  event: SlashCommandEvent,
  context: string,
  error: unknown,
): Promise<void> {
  await event.channel.post(`${context}: ${errorMessage(error)}`);
}

/** Build a "created vs already existed" summary for the admin commands. */
export function summarize(
  label: string,
  created: string[],
  skipped: string[],
): string {
  const lines = [`**${label} complete.**`];

  if (created.length > 0) {
    lines.push(`✅ Created: ${created.map((name) => `\`${name}\``).join(", ")}`);
  }
  if (skipped.length > 0) {
    lines.push(
      `⏭️ Already existed: ${skipped.map((name) => `\`${name}\``).join(", ")}`,
    );
  }
  if (created.length === 0 && skipped.length === 0) {
    lines.push("Nothing to do.");
  }

  return lines.join("\n");
}
