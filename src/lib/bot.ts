import { createDiscordAdapter, DiscordInteractionResponseFlag } from "@chat-adapter/discord";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

import { COMMAND_USE_TEMPLATE } from "./commands";

export const bot = new Chat({
  userName: process.env.BOT_USERNAME ?? "minerva-bot",
  adapters: {
    discord: createDiscordAdapter(),
  },
  state: createMemoryState(),
});

bot.onSlashCommand(`/${COMMAND_USE_TEMPLATE.name}`, async (event) => {
  await event.channel.post("All systems operational!");
});