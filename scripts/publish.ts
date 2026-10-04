#!/usr/bin/env bun
/**
 * Publish the bot's slash commands to Discord (global bulk overwrite).
 *
 *   bun run publish
 *
 * Bun auto-loads `.env.local`, so `DISCORD_BOT_TOKEN` and
 * `DISCORD_APPLICATION_ID` are picked up automatically.
 *
 * Note: global commands can take up to an hour to appear in Discord clients.
 *
 * @see https://docs.discord.com/developers/interactions/application-commands#registering-a-command
 */

import { commands } from "../src/lib/commands";
import { publishDiscordCommands } from "../src/lib/discord-commands";

try {
  console.log(
    `Publishing ${commands.length} global command(s): ${commands
      .map((command) => `/${command.name}`)
      .join(", ")}`,
  );

  const registered = await publishDiscordCommands({ commands });

  console.log(`\nPublished global commands (${registered.length}):`);
  for (const command of registered) {
    console.log(
      `  /${command.name} — ${command.description} [id: ${command.id}]`,
    );
  }

  console.log(
    "\nGlobal commands can take up to an hour to appear in Discord clients.",
  );
} catch (error) {
  console.error(
    `\nFailed to publish commands: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
