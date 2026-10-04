import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { discordRequest, resolveApiUrl, resolveBotToken } from "./discord-rest";

/** Publishing helpers for global application commands (`PUT`/`GET /applications/{id}/commands`). @see https://docs.discord.com/developers/interactions/application-commands#registering-a-command */

export interface PublishDiscordCommandsOptions {
  /** Commands to register. Pass the registry from `src/lib/commands.ts`. */
  commands?: RESTPostAPIApplicationCommandsJSONBody[];
  /** Discord application ID. Defaults to `DISCORD_APPLICATION_ID`. */
  applicationId?: string;
  /** Discord bot token. Defaults to `DISCORD_BOT_TOKEN`. */
  botToken?: string;
  /** Discord API base URL. Defaults to `DISCORD_API_URL` or the Discord v10 API. */
  apiUrl?: string;
}

interface ResolvedConfig {
  applicationId: string;
  botToken: string;
  apiUrl: string;
}

function resolveConfig(options: PublishDiscordCommandsOptions): ResolvedConfig {
  const applicationId = options.applicationId ?? process.env.DISCORD_APPLICATION_ID;

  if (!applicationId) {
    throw new Error(
      "Missing Discord application ID. Set DISCORD_APPLICATION_ID or pass applicationId.",
    );
  }

  return {
    applicationId,
    botToken: resolveBotToken(options.botToken),
    apiUrl: resolveApiUrl(options.apiUrl),
  };
}

function commandsEndpoint({ apiUrl, applicationId }: ResolvedConfig): string {
  return `${apiUrl}/applications/${applicationId}/commands`;
}

/** Bulk overwrite the global commands: missing names are removed, matching ids are preserved. */
export async function publishDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  const config = resolveConfig(options);
  const commands = options.commands ?? [];

  return discordRequest<APIApplicationCommand[]>(commandsEndpoint(config), config.botToken, {
    method: "PUT",
    body: JSON.stringify(commands),
  });
}

/** List the application's currently registered global commands. */
export async function listDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  const config = resolveConfig(options);

  return discordRequest<APIApplicationCommand[]>(commandsEndpoint(config), config.botToken, {
    method: "GET",
  });
}

/** Remove every global command by overwriting the list with an empty array. */
export async function clearDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  return publishDiscordCommands({ ...options, commands: [] });
}
