import type {
  RESTGetAPIGuildChannelsResult,
  RESTGetAPIGuildRolesResult,
  RESTPatchAPIChannelJSONBody,
  RESTPatchAPIChannelResult,
  RESTPostAPIChannelMessageResult,
  RESTPostAPIGuildChannelJSONBody,
  RESTPostAPIGuildChannelResult,
  RESTPostAPIGuildRoleJSONBody,
  RESTPostAPIGuildRoleResult,
  RESTPutAPIGuildMemberRoleResult,
  Snowflake,
} from "discord-api-types/v10";

import {
  discordApiRequest,
  type DiscordApiRequestOptions,
} from "./discord-rest";

/** Guild-scoped Discord REST operations used by the `/setup`, `/roles`, and `/assign` commands. @see https://docs.discord.com/developers/resources/guild */

/** Fetch every role in a guild. */
export function getGuildRoles(
  guildId: Snowflake,
  options?: DiscordApiRequestOptions,
): Promise<RESTGetAPIGuildRolesResult> {
  return discordApiRequest<RESTGetAPIGuildRolesResult>(
    `/guilds/${guildId}/roles`,
    { method: "GET" },
    options,
  );
}

/** Create a role in a guild. */
export function createGuildRole(
  guildId: Snowflake,
  role: RESTPostAPIGuildRoleJSONBody,
  options?: DiscordApiRequestOptions,
): Promise<RESTPostAPIGuildRoleResult> {
  return discordApiRequest<RESTPostAPIGuildRoleResult>(
    `/guilds/${guildId}/roles`,
    { method: "POST", body: role },
    options,
  );
}

/** Assign a role to a guild member. */
export function addGuildMemberRole(
  guildId: Snowflake,
  userId: Snowflake,
  roleId: Snowflake,
  options?: DiscordApiRequestOptions,
): Promise<RESTPutAPIGuildMemberRoleResult> {
  return discordApiRequest<RESTPutAPIGuildMemberRoleResult>(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT" },
    options,
  );
}

/** Remove a role from a guild member. */
export function removeGuildMemberRole(
  guildId: Snowflake,
  userId: Snowflake,
  roleId: Snowflake,
  options?: DiscordApiRequestOptions,
): Promise<RESTPutAPIGuildMemberRoleResult> {
  return discordApiRequest<RESTPutAPIGuildMemberRoleResult>(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE" },
    options,
  );
}

/** Fetch every channel (including categories) in a guild. */
export function getGuildChannels(
  guildId: Snowflake,
  options?: DiscordApiRequestOptions,
): Promise<RESTGetAPIGuildChannelsResult> {
  return discordApiRequest<RESTGetAPIGuildChannelsResult>(
    `/guilds/${guildId}/channels`,
    { method: "GET" },
    options,
  );
}

/** Create a channel or category in a guild. */
export function createGuildChannel(
  guildId: Snowflake,
  channel: RESTPostAPIGuildChannelJSONBody,
  options?: DiscordApiRequestOptions,
): Promise<RESTPostAPIGuildChannelResult> {
  return discordApiRequest<RESTPostAPIGuildChannelResult>(
    `/guilds/${guildId}/channels`,
    { method: "POST", body: channel },
    options,
  );
}

/** Update a channel or category (e.g. repair permission overwrites on re-run). */
export function patchChannel(
  channelId: Snowflake,
  channel: RESTPatchAPIChannelJSONBody,
  options?: DiscordApiRequestOptions,
): Promise<RESTPatchAPIChannelResult> {
  return discordApiRequest<RESTPatchAPIChannelResult>(
    `/channels/${channelId}`,
    { method: "PATCH", body: channel },
    options,
  );
}

/** Delete a channel or category in a guild. */
export function deleteGuildChannel(
  channelId: Snowflake,
  options?: DiscordApiRequestOptions,
): Promise<void> {
  return discordApiRequest<void>(
    `/channels/${channelId}`,
    { method: "DELETE" },
    options,
  );
}

/** Post a plain-text message in a channel (used when the interaction's channel no longer exists). */
export function createChannelMessage(
  channelId: Snowflake,
  content: string,
  options?: DiscordApiRequestOptions,
): Promise<RESTPostAPIChannelMessageResult> {
  return discordApiRequest<RESTPostAPIChannelMessageResult>(
    `/channels/${channelId}/messages`,
    { method: "POST", body: { content } },
    options,
  );
}
