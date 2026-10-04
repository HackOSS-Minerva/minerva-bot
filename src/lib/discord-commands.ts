import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

/**
 * Helpers for publishing application commands to Discord.
 *
 * The Chat SDK handles inbound command interactions but does not register
 * commands for you, so this module wraps Discord's REST endpoints:
 *
 * - `PUT  /applications/{application_id}/commands` — bulk overwrite (global)
 * - `GET  /applications/{application_id}/commands` — list (global)
 *
 * @see https://docs.discord.com/developers/interactions/application-commands#registering-a-command
 */

const DEFAULT_API_URL = "https://discord.com/api/v10";

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

function resolveConfig(
  options: PublishDiscordCommandsOptions,
): ResolvedConfig {
  const applicationId =
    options.applicationId ?? process.env.DISCORD_APPLICATION_ID;
  const botToken = options.botToken ?? process.env.DISCORD_BOT_TOKEN;
  const apiUrl = (
    options.apiUrl ??
    process.env.DISCORD_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/+$/, "");

  if (!applicationId) {
    throw new Error(
      "Missing Discord application ID. Set DISCORD_APPLICATION_ID or pass applicationId.",
    );
  }

  if (!botToken) {
    throw new Error(
      "Missing Discord bot token. Set DISCORD_BOT_TOKEN or pass botToken.",
    );
  }

  return { applicationId, botToken, apiUrl };
}

function commandsEndpoint({ apiUrl, applicationId }: ResolvedConfig): string {
  return `${apiUrl}/applications/${applicationId}/commands`;
}

async function discordRequest<T>(
  url: string,
  botToken: string,
  init: { method: string; body?: string },
): Promise<T> {
  const response = await fetch(url, {
    method: init.method,
    body: init.body,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Discord API ${init.method} ${url} failed with ${response.status} ${
        response.statusText
      }${detail ? `: ${detail}` : ""}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Bulk overwrite the application's global commands.
 *
 * Existing global commands not present in `commands` are removed. Commands are
 * overwritten in place, so ids are preserved where names match.
 */
export async function publishDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  const config = resolveConfig(options);
  const commands = options.commands ?? [];

  return discordRequest<APIApplicationCommand[]>(
    commandsEndpoint(config),
    config.botToken,
    { method: "PUT", body: JSON.stringify(commands) },
  );
}

/** List the application's currently registered global commands. */
export async function listDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  const config = resolveConfig(options);

  return discordRequest<APIApplicationCommand[]>(
    commandsEndpoint(config),
    config.botToken,
    { method: "GET" },
  );
}

/** Remove every global command by overwriting the list with an empty array. */
export async function clearDiscordCommands(
  options: PublishDiscordCommandsOptions = {},
): Promise<APIApplicationCommand[]> {
  return publishDiscordCommands({ ...options, commands: [] });
}
