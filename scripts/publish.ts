#!/usr/bin/env bun
/** Publish the bot's slash commands to Discord (`bun run publish`; global bulk overwrite, up to an hour to propagate). @see https://docs.discord.com/developers/interactions/application-commands#registering-a-command */

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
    console.log(`  /${command.name} — ${command.description} [id: ${command.id}]`);
  }

  console.log("\nGlobal commands can take up to an hour to appear in Discord clients.");
} catch (error) {
  console.error(
    `\nFailed to publish commands: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
