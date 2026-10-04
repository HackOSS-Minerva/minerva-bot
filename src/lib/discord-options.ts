import type { DiscordAdapter } from "@chat-adapter/discord";
import type { APIChatInputApplicationCommandInteraction, APIUser } from "discord-api-types/v10";
import type { SlashCommandEvent } from "chat";

/** Helpers for reading the raw interaction tree on `SlashCommandEvent.raw` that the SDK flattens into `event.text`. */

/** Administrator permission bit (0x8). */
const ADMINISTRATOR = 1n << 3n;

/** Options are only typed on chat-input interactions, which is all this bot registers. */
type CommandInteraction = APIChatInputApplicationCommandInteraction;
type CommandOption = NonNullable<NonNullable<CommandInteraction["data"]>["options"]>[number];

function asInteraction(raw: unknown): CommandInteraction | undefined {
  return raw as CommandInteraction | undefined;
}

function getOptions(raw: unknown): CommandOption[] {
  return asInteraction(raw)?.data?.options ?? [];
}

/** Guild id for the interaction, or null when it was not sent from a guild. */
export function getGuildId(raw: unknown): string | null {
  return asInteraction(raw)?.guild_id ?? null;
}

/** Application id (equal to the bot's user id) that received the interaction. */
export function getApplicationId(raw: unknown): string | null {
  return asInteraction(raw)?.application_id ?? null;
}

/** Whether the invoking member has the Administrator permission. */
export function isAdministrator(raw: unknown): boolean {
  const permissions = asInteraction(raw)?.member?.permissions;
  if (!permissions) {
    return false;
  }
  try {
    return (BigInt(permissions) & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

/** Id of the user who invoked the command (guild member or DM user). */
export function getInvokingUserId(raw: unknown): string | null {
  const interaction = asInteraction(raw);
  return interaction?.member?.user?.id ?? interaction?.user?.id ?? null;
}

/** Read a leaf string option (e.g. a string choice) by name. */
export function getStringOption(raw: unknown, name: string): string | null {
  for (const option of getOptions(raw)) {
    if (option.name === name && "value" in option && option.value !== undefined) {
      return String(option.value);
    }
  }
  return null;
}

/** A user option resolved to its id and display name. */
export interface ResolvedUserOption {
  id: string;
  name: string;
}

/** Resolve a user mention option, preferring resolved users and falling back to the raw id. */
export function getUserOption(raw: unknown, name: string): ResolvedUserOption | null {
  const resolved = asInteraction(raw)?.data?.resolved;

  for (const option of getOptions(raw)) {
    if (option.name === name && "value" in option && option.value !== undefined) {
      const id = String(option.value);
      const user: APIUser | undefined = resolved?.users?.[id];
      return { id, name: user?.global_name || user?.username || id };
    }
  }
  return null;
}

/** The bot's own user id: the adapter's, falling back to the interaction's application id. */
export function getBotUserId(event: SlashCommandEvent): string | null {
  const adapter = event.adapter as Partial<DiscordAdapter> | undefined;
  return adapter?.botUserId ?? getApplicationId(event.raw);
}
