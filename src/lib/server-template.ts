import { ChannelType } from "discord-api-types/v10";

/** Single source of truth for the server structure: {@link TEMPLATE_ROLES} (`/roles`, `/autoassign`), {@link SELF_ASSIGNABLE_ROLES} (`/assign`), {@link TEMPLATE_CATEGORIES} (`/setup`). */

/** A role created by `/roles` and granted by `/assign` and `/autoassign`. */
export interface TemplateRole {
  /** Stable key used in slash command choices and lookups. */
  key: "hacker" | "organizer" | "judge" | "mentor";
  /** Discord role name. */
  name: string;
  /** RGB color as a hex integer. */
  color: number;
  /** Pin the role in the member sidebar. */
  hoist: boolean;
  /** Allow @mentioning the role. */
  mentionable: boolean;
  /** When false, only administrators (via `/autoassign`) can grant it. */
  selfAssignable: boolean;
}

/** Roles that `/roles` creates and `/autoassign` can grant. */
export const TEMPLATE_ROLES: TemplateRole[] = [
  { key: "hacker", name: "Hacker", color: 0x5865f2, hoist: true, mentionable: true, selfAssignable: true },
  { key: "organizer", name: "Organizer", color: 0xfee75c, hoist: true, mentionable: true, selfAssignable: false },
  { key: "judge", name: "Judge", color: 0xeb459e, hoist: true, mentionable: true, selfAssignable: true },
  { key: "mentor", name: "Mentor", color: 0x57f287, hoist: true, mentionable: true, selfAssignable: true },
];

/** Roles that `/assign` can grant (self-serve, in template order). */
export const SELF_ASSIGNABLE_ROLES: TemplateRole[] = TEMPLATE_ROLES.filter(
  (role) => role.selfAssignable,
);

/** The self-assignable role keys, in template order. */
export const ASSIGNABLE_ROLE_NAMES: TemplateRole["key"][] =
  SELF_ASSIGNABLE_ROLES.map((role) => role.key);

/** A channel created by `/setup`. */
export interface TemplateChannel {
  name: string;
  type: ChannelType.GuildText | ChannelType.GuildForum;
  /**
   * Colored circle prefixed to the channel's topic (see {@link channelTopic}).
   * Discord strips emoji from text/forum channel *names*, so the topic is the
   * only place an emoji can live for these channels.
   */
  emoji: string;
  /**
   * Short purpose line shown in the channel header. Falls back to a generated
   * `<emoji> | <name>` when omitted.
   */
  topic?: string;
}

/** A category (and its channels) created by `/setup`. */
export interface TemplateCategory {
  name: string;
  /**
   * Colored circle prefixed to the category's name (see
   * {@link categoryLabel}). Category names are exempt from Discord's
   * channel-name normalization, so the emoji survives in the server sidebar.
   */
  emoji: string;
  /**
   * When true, `@everyone` is denied `ViewChannel`, so only members with a
   * privileged role can see the category and its channels. The `Organizer`
   * role (and the bot) get admin-level rights over these channels; server
   * administrators always bypass channel overwrites.
   */
  adminOnly?: boolean;
  channels: TemplateChannel[];
}

/**
 * Name a category is created with: `<emoji> <name>`, e.g. `🔵 Info Desk`.
 *
 * Categories are exempt from the lowercase/hyphen normalization Discord applies
 * to text channel names, so this emoji is preserved verbatim in the sidebar.
 * This is the single place the category naming rule is defined.
 */
export function categoryLabel(category: TemplateCategory): string {
  return `${category.emoji} ${category.name}`;
}

/**
 * Topic a channel is created with, e.g. `🔵 | Rules and event guidelines`.
 *
 * The `<emoji> | <label>` shape echoes the requested naming convention, but the
 * label is a human-readable purpose line rather than the raw slug — the emoji is
 * the part Discord cannot put in the channel name itself. This is the single
 * place the channel topic rule is defined; omitting `topic` falls back to
 * `<emoji> | <name>`.
 */
export function channelTopic(channel: TemplateChannel): string {
  return channel.topic ?? `${channel.emoji} | ${channel.name}`;
}

/** Categories and channels created by `/setup`, in display order. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: "Info Desk",
    emoji: "🔵",
    channels: [
      { name: "rules", type: ChannelType.GuildText, emoji: "🔵", topic: "🔵 | Rules and event guidelines" },
      { name: "welcome", type: ChannelType.GuildText, emoji: "🟢", topic: "🟢 | Say hello and introduce yourself" },
      { name: "role-request", type: ChannelType.GuildText, emoji: "🟡", topic: "🟡 | Ask an organizer for a role" },
      { name: "resources", type: ChannelType.GuildText, emoji: "⚪", topic: "⚪ | Links, guides, and reference material" },
      { name: "faq", type: ChannelType.GuildText, emoji: "🟣", topic: "🟣 | Frequently asked questions" },
    ],
  },
  {
    name: "workshops",
    emoji: "🟠",
    channels: [
      { name: "workshop-questions", type: ChannelType.GuildText, emoji: "🟠", topic: "🟠 | Questions for workshop speakers" },
      { name: "mlh", type: ChannelType.GuildText, emoji: "🟡", topic: "🟡 | Major League Hacking announcements" },
    ],
  },
  {
    name: "help-desk",
    emoji: "🟢",
    channels: [
      { name: "team-formation", type: ChannelType.GuildForum, emoji: "🟢", topic: "🟢 | Find teammates and post team requests" },
    ],
  },
  {
    name: "general",
    emoji: "⚪",
    channels: [
      { name: "introductions", type: ChannelType.GuildText, emoji: "🟢", topic: "🟢 | Introduce yourself to the hackathon" },
      { name: "talk-to-organizers", type: ChannelType.GuildText, emoji: "🔴", topic: "🔴 | Talk directly to the organizers" },
      { name: "general", type: ChannelType.GuildText, emoji: "⚪", topic: "⚪ | General chatter" },
      { name: "linkedin", type: ChannelType.GuildText, emoji: "🔵", topic: "🔵 | Share your LinkedIn" },
      { name: "github", type: ChannelType.GuildText, emoji: "⚫", topic: "⚫ | Share your GitHub" },
      { name: "devpost", type: ChannelType.GuildText, emoji: "🟠", topic: "🟠 | Share your Devpost" },
      { name: "off-topic", type: ChannelType.GuildText, emoji: "🟣", topic: "🟣 | Anything that isn't hackathon-related" },
      { name: "memes", type: ChannelType.GuildText, emoji: "🟡", topic: "🟡 | Memes" },
    ],
  },
  {
    name: "mentors",
    emoji: "🟡",
    channels: [
      { name: "mentor-introductions", type: ChannelType.GuildText, emoji: "🟡", topic: "🟡 | Meet the mentors" },
      { name: "ask-mentors", type: ChannelType.GuildText, emoji: "🟢", topic: "🟢 | Ask a mentor for help" },
    ],
  },
  {
    name: "organizers",
    emoji: "🔴",
    adminOnly: true,
    channels: [
      { name: "general", type: ChannelType.GuildText, emoji: "🔴", topic: "🔴 | Organizer discussion" },
      { name: "system-logs", type: ChannelType.GuildText, emoji: "⚫", topic: "⚫ | Automated system logs" },
    ],
  },
];
