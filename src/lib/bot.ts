import { createDiscordAdapter, DiscordInteractionResponseFlag } from "@chat-adapter/discord";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

import { handleAssign } from "./handlers/assign";
import { handleAutoAssign } from "./handlers/autoassign";
import { handleRoles } from "./handlers/roles";
import { handleSetup } from "./handlers/setup";
import { handleWelcome } from "./handlers/welcome";

/** Slash commands whose response is only visible to the person who ran them. */
const EPHEMERAL_COMMANDS = ["/assign", "/autoassign"];

export const bot = new Chat({
  userName: "Minerva Bot",
  adapters: {
    discord: createDiscordAdapter({
      interactionFlags: ({ command }) =>
        EPHEMERAL_COMMANDS.includes(command) ? DiscordInteractionResponseFlag.Ephemeral : undefined,
    }),
  },
  state: createMemoryState(),
});

bot.onSlashCommand("/assign", handleAssign);
bot.onSlashCommand("/autoassign", handleAutoAssign);
bot.onSlashCommand("/setup", handleSetup);
bot.onSlashCommand("/roles", handleRoles);
bot.onSlashCommand("/welcome", handleWelcome);
