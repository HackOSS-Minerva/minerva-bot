# minerva-bot

A chat bot built with Chat SDK.

## Getting Started

1. Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

2. Start the dev server:

```bash
bun run dev
```

3. Expose your local server to the internet and configure platform webhook URLs.

## Endpoints

- Discord: `/api/webhooks/discord`

## Commands

The bot registers four guild slash commands. Definitions live in
`src/lib/commands.ts`; handlers live in `src/lib/handlers/`. Tenants
(Discord server ID → hackathon) live in `tenants.json` and are read through
`src/lib/tenants.ts`.

| Command                | Who can run it | Description                                                                         |
| ---------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `/assign <role>`       | Everyone       | Assign yourself the `hacker`, `judge`, or `mentor` role.                            |
| `/assign @user <role>` | Administrators | Assign a role to another member.                                                    |
| `/setup`               | Administrators | ⚠️ Destructive: delete every channel and category, then recreate the standard ones. |
| `/roles`               | Administrators | Create the `Hacker`, `Organizer`, `Judge`, and `Mentor` roles.                      |
| `/welcome`             | Everyone       | Greet this server's hackathon and report systems status.                            |

The `/assign` command responds ephemerally, so only the invoker sees the
result. `/setup`, `/roles`, and `/welcome` reply publicly so everyone in the
channel sees the summary or greeting. `/setup` groups its summary by category:
what it deleted first, new categories, new channels, which channels already
exist, and anything it updated (permissions, or drifted category names and
topics). `/setup` deletes every channel before rebuilding, so the summary
normally can't go back to the channel you ran it in — it is posted in
`#system-logs` (inside the organizer-only `organizers` category) instead,
falling back to `#general` if that channel doesn't exist. Channels the bot
cannot delete are reported as failures rather than silently skipped, so a run may
only partially succeed.

There is deliberately no separate "delete everything" command: `/setup` already
wipes the server as its first step, so `/nuke` would only have been a slower,
riskier way to reach the same empty state.

`/assign` and `/setup` require the roles to already exist — run `/roles` first.
If any template roles are missing, `/setup` stops and tells you to run `/roles`
and then `/setup`.

**`/setup` is destructive.** It posts a warning, then deletes _every_ existing
channel and category in the server before rebuilding the template from
`src/lib/server-template.ts` — so anything outside the template (extra
channels, threads, pins, message history) is permanently lost. `/roles` is not
destructive: it is idempotent and safe to re-run.

The template created by `/roles` and `/setup` lives in
`src/lib/server-template.ts`:

- **Roles:** `Hacker`, `Organizer`, `Judge`, `Mentor`
- **Categories/channels:** category names carry a colored circle, and each
  channel's topic carries its own:
  - **🔵 Info Desk** — `rules`, `welcome`, `role-request`, `resources`, `faq`
  - **🟠 workshops** — `workshop-questions`, `mlh`
  - **🟢 help-desk** — `team-formation` (forum)
  - **⚪ general** — `introductions`, `talk-to-organizers`, `general`, `linkedin`, `github`, `devpost`, `off-topic`, `memes`
  - **🟡 mentors** — `mentor-introductions`, `ask-mentors`
  - **🔴 organizers** — `general`, `system-logs` (hidden from `@everyone`; the `Organizer` role and administrators can see and manage it)

  **Why the emoji lives in two different places.** Discord strips emoji from
  text/forum channel _names_ (it lowercases them and turns spaces into hyphens),
  but category names are exempt from that normalization and channel _topics_ are
  unconstrained. So the sidebar circle comes from the category name and the
  per-channel circle comes from the topic, built by `categoryLabel()` and
  `channelTopic()` in `src/lib/server-template.ts`. Don't "fix" this by inlining
  the emoji into a channel name — Discord will silently drop it. The plain
  channel names also keep `#channel` links and `/setup`'s idempotent re-runs
  working; re-running repairs drifted category names and topics.

The bot needs the **Manage Roles** and **Manage Channels** permissions, and its
highest role must sit above the roles it manages.

## Publishing Discord Slash Commands

The Chat SDK handles inbound slash commands but does **not** register them with Discord, so commands must be published separately. Command definitions live in one place — `src/lib/commands.ts` — and are published with the Discord REST API (`PUT /applications/{application_id}/commands`, global bulk overwrite).

Bun auto-loads `.env.local`, so `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` are read automatically:

```bash
bun run publish    # bulk overwrite global commands
bun run commands   # list currently registered commands
bun run clear      # remove every global command
```

To add a command, append it to the `commands` array in `src/lib/commands.ts` and re-run `bun run publish`. Registering globally can take up to an hour to appear in Discord clients.

## Project Structure

```
src/
  lib/bot.ts                              Bot configuration and handlers
  lib/commands.ts                         Discord command registry (source of truth)
  lib/server-template.ts                  Roles/channels created by /roles and /setup
  lib/discord-rest.ts                     Shared low-level Discord REST client
  lib/discord-commands.ts                 Discord REST helpers to publish/list/clear commands
  lib/discord-guild.ts                    Guild role/channel REST helpers
  lib/discord-options.ts                  Raw interaction parsing (guild id, options, admin check)
  lib/handlers/                           One handler per slash command (assign, setup, roles, welcome)
  lib/tenants.ts                          Typed Discord server ID → tenant lookup over tenants.json
  app/api/webhooks/[platform]/route.ts    Webhook endpoint for platform adapters
  app/api/chat/route.ts                   Web adapter endpoint when selected
scripts/
  publish.ts                              Publish slash commands (`bun run publish`)
  list.ts                                 List registered slash commands (`bun run commands`)
  clear.ts                                Remove all global slash commands (`bun run clear`)
tenants.json                              Discord server ID → hackathon tenant registry
.env.example                              Required environment variables
```

## Scripts

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `bun run dev`       | Start the development server                    |
| `bun run build`     | Create a production build                       |
| `bun run start`     | Start the production server                     |
| `bun run typecheck` | Type-check the project                          |
| `bun run publish`   | Publish (bulk overwrite) Discord slash commands |
| `bun run commands`  | List registered Discord slash commands          |
| `bun run clear`     | Remove every global Discord slash command       |

## Learn More

- [Chat SDK Documentation](https://chat-sdk.dev/docs)
- [Adapter Setup Guides](https://chat-sdk.dev/adapters)
- [GitHub Repository](https://github.com/vercel/chat)
