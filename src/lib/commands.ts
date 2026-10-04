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

/** `/assign <hacker|organizer|judge|mentor>` — open to all members; assigns the role to yourself only. */
export const COMMAND_ASSIGN = {
  ...guildCommand,
  name: "assign",
  description: "Assign yourself a hacker, judge, or mentor role.",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "role",
      description: "Which role to assign to yourself",
      required: true,
      choices: TEMPLATE_ROLES.map((role) => ({
        name: role.name,
        value: role.key,
      })),
    },
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/autoassign <user> <hacker|organizer|judge|mentor>` — administrator only; assigns any member a template role. */
export const COMMAND_AUTOASSIGN = {
  ...adminGuildCommand,
  name: "autoassign",
  description:
    "Assign any member a hacker, organizer, judge, or mentor role (administrators only).",
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "user",
      description: "Member to assign the role to",
      required: true,
    },
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
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/setup` — DESTRUCTIVE: wipe every channel and category, then recreate the standard structure (administrator only). */
export const COMMAND_SETUP = {
  ...adminGuildCommand,
  name: "setup",
  description:
    "⚠️ Destructive: deletes every channel and category, then recreates the template (admins only).",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/roles` — create the standard roles (administrator only). */
export const COMMAND_ROLES = {
  ...adminGuildCommand,
  name: "roles",
  description:
    "Create the server's standard hacker, organizer, judge, and mentor roles (administrators only).",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** `/welcome` — greet this server's hackathon and report systems status. */
export const COMMAND_WELCOME = {
  ...adminGuildCommand,
  name: "welcome",
  description: "Greet this server's hackathon and check systems status (administrators only).",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/** Every command to publish via bulk overwrite (`PUT /applications/{application_id}/commands`). */
export const commands = [
  COMMAND_ASSIGN,
  COMMAND_AUTOASSIGN,
  COMMAND_SETUP,
  COMMAND_ROLES,
  COMMAND_WELCOME,
] satisfies RESTPostAPIApplicationCommandsJSONBody[];

/** Command names (without the leading slash) in the registry. */
export const commandNames = commands.map((command) => command.name);
