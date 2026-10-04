/** Low-level Discord REST helpers, since the Chat SDK does not manage guild resources. */

const DEFAULT_API_URL = "https://discord.com/api/v10";

/** Base Discord REST URL, honoring `DISCORD_API_URL`. Trailing slashes trimmed. */
export function resolveApiUrl(apiUrl?: string): string {
  return (apiUrl ?? process.env.DISCORD_API_URL ?? DEFAULT_API_URL).replace(
    /\/+$/,
    "",
  );
}

/** Bot token from the argument or `DISCORD_BOT_TOKEN`. */
export function resolveBotToken(botToken?: string): string {
  const resolved = botToken ?? process.env.DISCORD_BOT_TOKEN;
  if (!resolved) {
    throw new Error(
      "Missing Discord bot token. Set DISCORD_BOT_TOKEN or pass botToken.",
    );
  }
  return resolved;
}

/** Minimal description of a Discord REST call. */
export interface DiscordRequestInit {
  method: string;
  body?: string;
}

/** Perform an authenticated JSON request against an absolute Discord URL. */
export async function discordRequest<T>(
  url: string,
  botToken: string,
  init: DiscordRequestInit,
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

/** Credential overrides for {@link discordApiRequest}. */
export interface DiscordApiRequestOptions {
  botToken?: string;
  apiUrl?: string;
}

/** Call a Discord REST path with the bot token; `path` must start with a leading slash. */
export async function discordApiRequest<T>(
  path: string,
  init: { method: string; body?: unknown },
  options: DiscordApiRequestOptions = {},
): Promise<T> {
  const apiUrl = resolveApiUrl(options.apiUrl);
  const botToken = resolveBotToken(options.botToken);

  return discordRequest<T>(`${apiUrl}${path}`, botToken, {
    method: init.method,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

/** Normalize an unknown thrown value into a readable message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
