import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ChannelType,
  InteractionContextType,
} from "discord-api-types/v10";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

/**
 * Single source of truth for the Discord application commands this bot exposes.
 *
 * Both the runtime handlers (`src/lib/bot.ts`) and the publishing helper
 * (`scripts/publish.ts`) read from this registry, so the registration payload
 * can never drift from the code.
 *
 * Run `bun run publish` after changing anything here to push the updated
 * commands to Discord.
 */

/**
 * Fields shared by every command in this registry. Mirrors the live commands:
 * administrators only, server context only, and usable wherever the app is
 * installed.
 */
const serverAdminCommand = {
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "8", // Administrator
  contexts: [InteractionContextType.Guild],
  integration_types: [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ],
} satisfies Partial<RESTPostAPIApplicationCommandsJSONBody>;

export const COMMAND_CREATE_ROLE = {
  ...serverAdminCommand,
  name: "create-role",
  description: "Create a new role in this server.",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "name",
      description: "Name of the new role",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "color",
      description: "Hex color, e.g. #5865F2 (optional, defaults to white)",
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "mentionable",
      description: "Whether the role can be @mentioned by everyone (default: yes)",
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "hoist",
      description: "Whether the role is shown separately in the member list (default: yes)",
    },
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

export const COMMAND_CREATE_CHANNEL = {
  ...serverAdminCommand,
  name: "create-channel",
  description: "Create a new channel in this server.",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "name",
      description: "Name of the new channel",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "type",
      description: "Channel type",
      required: true,
      choices: [
        { name: "Text", value: "text" },
        { name: "Announcement", value: "announcement" },
        { name: "Voice", value: "voice" },
        { name: "Stage", value: "stage" },
        { name: "Forum", value: "forum" },
      ],
    },
    {
      type: ApplicationCommandOptionType.Channel,
      name: "category",
      description: "Category to place this channel under (optional)",
      channel_types: [ChannelType.GuildCategory],
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "topic",
      description: "Topic text for the channel (optional)",
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "private",
      description: "If True, only administrators can see this channel",
    },
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

export const COMMAND_CREATE_CATEGORY = {
  ...serverAdminCommand,
  name: "create-category",
  description: "Create a new channel category in this server.",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "name",
      description: "Name of the new category",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "private",
      description:
        "If True, only administrators can view this category and its channels",
    },
  ],
} satisfies RESTPostAPIApplicationCommandsJSONBody;

export const COMMAND_USE_TEMPLATE = {
  ...serverAdminCommand,
  name: "use-template",
  description: "Create this server's full role and channel layout from the template.",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

/**
 * Every command to publish to Discord via bulk overwrite
 * (`PUT /applications/{application_id}/commands`).
 */
export const commands = [
  COMMAND_CREATE_ROLE,
  COMMAND_CREATE_CHANNEL,
  COMMAND_CREATE_CATEGORY,
  COMMAND_USE_TEMPLATE,
] satisfies RESTPostAPIApplicationCommandsJSONBody[];

/** Command names (without the leading slash) in the registry. */
export const commandNames = commands.map((command) => command.name);
