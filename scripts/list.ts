#!/usr/bin/env bun
/** List the bot's registered global Discord slash commands (`bun run commands`; Bun auto-loads `.env.local`). */

import { listDiscordCommands } from "../src/lib/discord-commands";

try {
  const commands = await listDiscordCommands();

  console.log(`\nRegistered global commands (${commands.length}):`);

  if (commands.length === 0) {
    console.log("  (none)");
  } else {
    for (const command of commands) {
      console.log(
        `  /${command.name} — ${command.description} [id: ${command.id}]`,
      );
    }
  }
} catch (error) {
  console.error(
    `\nFailed to list commands: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
