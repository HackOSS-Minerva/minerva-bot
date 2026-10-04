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

/**
 * Build a "created vs already exist" summary for the admin commands.
 * `noun` names the untouched items in the "already exist" sentence
 * (e.g. `roles`, `channels`).
 *
 * The `… complete.` header is only emitted when something was actually created.
 * When everything already existed there was no work to do, so the reply is just
 * the "already exist" line — a completion banner next to a no-op reads as though
 * the command changed something.
 */
export function summarize(
  label: string,
  noun: string,
  created: string[],
  skipped: string[],
): string {
  const lines: string[] = [];

  if (created.length > 0) {
    lines.push(
      `**${label} complete.**`,
      `✅ Created: ${created.map((name) => `\`${name}\``).join(", ")}`,
    );
  }

  if (skipped.length > 0) {
    lines.push(
      `The following ${noun} already exist: ${skipped.map((name) => `\`${name}\``).join(", ")}`,
    );
  }

  if (created.length === 0 && skipped.length === 0) {
    return "Nothing to do.";
  }

  return lines.join("\n");
}
