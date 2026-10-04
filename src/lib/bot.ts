import {
  createDiscordAdapter,
  DiscordInteractionResponseFlag,
} from "@chat-adapter/discord";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

import { handleAssign } from "./handlers/assign";
import { handleRoles } from "./handlers/roles";
import { handleSetup } from "./handlers/setup";
import { handleWelcome } from "./handlers/welcome";

/** Slash commands whose response is only visible to the person who ran them. */
const EPHEMERAL_COMMANDS = ["/assign", "/setup", "/roles"];

export const bot = new Chat({
  userName: process.env.BOT_USERNAME ?? "minerva-bot",
  adapters: {
    discord: createDiscordAdapter({
      interactionFlags: ({ command }) =>
        EPHEMERAL_COMMANDS.includes(command)
          ? DiscordInteractionResponseFlag.Ephemeral
          : undefined,
    }),
  },
  state: createMemoryState(),
});

bot.onSlashCommand("/assign", handleAssign);
bot.onSlashCommand("/setup", handleSetup);
bot.onSlashCommand("/roles", handleRoles);
bot.onSlashCommand("/welcome", handleWelcome);
