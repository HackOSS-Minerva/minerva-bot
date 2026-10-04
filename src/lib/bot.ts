import { createDiscordAdapter, DiscordInteractionResponseFlag } from "@chat-adapter/discord";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

export const bot = new Chat({
  userName: process.env.BOT_USERNAME ?? "minerva-bot",
  adapters: {
    discord: createDiscordAdapter(),
  },
  state: createMemoryState(),
});

bot.onSlashCommand("/use-template", async (event) => {
  await event.channel.post("All systems operational!");
});