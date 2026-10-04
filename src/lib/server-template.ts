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
}

/** A category (and its channels) created by `/setup`. */
export interface TemplateCategory {
  name: string;
  /**
   * When true, `@everyone` is denied `ViewChannel`, so only members with a
   * privileged role can see the category and its channels. The `Organizer`
   * role (and the bot) get admin-level rights over these channels; server
   * administrators always bypass channel overwrites.
   */
  adminOnly?: boolean;
  channels: TemplateChannel[];
}

/** Categories and channels created by `/setup`, in display order. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: "Info Desk",
    channels: [
      { name: "rules", type: ChannelType.GuildText },
      { name: "welcome", type: ChannelType.GuildText },
      { name: "role-request", type: ChannelType.GuildText },
      { name: "resources", type: ChannelType.GuildText },
      { name: "faq", type: ChannelType.GuildText },
    ],
  },
  {
    name: "workshops",
    channels: [
      { name: "workshop-questions", type: ChannelType.GuildText },
      { name: "mlh", type: ChannelType.GuildText },
    ],
  },
  {
    name: "help-desk",
    channels: [{ name: "team-formation", type: ChannelType.GuildForum }],
  },
  {
    name: "general",
    channels: [
      { name: "introductions", type: ChannelType.GuildText },
      { name: "talk-to-organizers", type: ChannelType.GuildText },
      { name: "general", type: ChannelType.GuildText },
      { name: "linkedin", type: ChannelType.GuildText },
      { name: "github", type: ChannelType.GuildText },
      { name: "devpost", type: ChannelType.GuildText },
      { name: "off-topic", type: ChannelType.GuildText },
      { name: "memes", type: ChannelType.GuildText },
    ],
  },
  {
    name: "mentors",
    channels: [
      { name: "mentor-introductions", type: ChannelType.GuildText },
      { name: "ask-mentors", type: ChannelType.GuildText },
    ],
  },
  {
    name: "organizers",
    adminOnly: true,
    channels: [
      { name: "general", type: ChannelType.GuildText },
      { name: "system-logs", type: ChannelType.GuildText },
    ],
  },
];
