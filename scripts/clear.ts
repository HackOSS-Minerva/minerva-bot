#!/usr/bin/env bun
/**
 * Remove every global Discord slash command.
 *
 *   bun run clear
 *
 * Bun auto-loads `.env.local`, so `DISCORD_BOT_TOKEN` and
 * `DISCORD_APPLICATION_ID` are picked up automatically.
 */

import { clearDiscordCommands } from "../src/lib/discord-commands";

try {
  const remaining = await clearDiscordCommands();
  console.log(
    `\nCleared global commands. ${remaining.length} command(s) remain.`,
  );
} catch (error) {
  console.error(
    `\nFailed to clear commands: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
