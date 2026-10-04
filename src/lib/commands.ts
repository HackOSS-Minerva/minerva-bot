import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord-api-types/v10";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

import { TEMPLATE_ROLES } from "./server-template";

/** Single source of truth for the bot's Discord application commands; run `bun run publish` after changes. */

/** Fields shared by every command: server context only, usable wherever the app is installed. */
const guildCommand = {
  type: ApplicationCommandType.ChatInput,
  contexts: [InteractionContextType.Guild],
  integration_types: [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ],
} satisfies Partial<RESTPostAPIApplicationCommandsJSONBody>;

/** Guild command restricted to members with the Administrator permission. */
const adminGuildCommand = {
  ...guildCommand,
  default_member_permissions: "8", // Administrator
} satisfies Partial<RESTPostAPIApplicationCommandsJSONBody>;

/** `/assign [user] <hacker|judge|mentor>` — open to all members; assigning to another member is enforced at runtime (administrator only). */
export const COMMAND_ASSIGN = {
  ...guildCommand,
  name: "assign",
  description: "Assign a hacker, judge, or mentor role.",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "role",
      description: "Which role to assign",
      required: true,
      choices: TEMPLATE_ROLES.map((role) => ({
        name: role.name,
        value: role.key,
      })),
    },
    {
      type: ApplicationCommandOptionType.User,
      name: "user",
      description:
        "Member to assign the role to (administrators only; defaults to you)",
    },
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/setup` — create the standard categories and channels (administrator only). */
export const COMMAND_SETUP = {
  ...adminGuildCommand,
  name: "setup",
  description: "Create the server's standard categories and channels.",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/roles` — create the standard roles (administrator only). */
export const COMMAND_ROLES = {
  ...adminGuildCommand,
  name: "roles",
  description: "Create the server's standard hacker, judge, and mentor roles.",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/welcome` — greet this server's hackathon and report systems status. */
export const COMMAND_WELCOME = {
  ...guildCommand,
  name: "welcome",
  description: "Greet this server's hackathon and check systems status.",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** Every command to publish via bulk overwrite (`PUT /applications/{application_id}/commands`). */
export const commands = [
  COMMAND_ASSIGN,
  COMMAND_SETUP,
  COMMAND_ROLES,
  COMMAND_WELCOME,
] satisfies RESTPostAPIApplicationCommandsJSONBody[];

/** Command names (without the leading slash) in the registry. */
export const commandNames = commands.map((command) => command.name);
