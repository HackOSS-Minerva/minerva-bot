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
- Discord Gateway (cron): `/api/discord/gateway` - keeps the Gateway connection alive so message and reaction events reach the bot. Scheduled in `vercel.json`, authenticated with `CRON_SECRET`, and requires Vercel Pro or Enterprise.

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
  lib/discord-commands.ts                 Discord REST helpers to publish/list/clear commands
  app/api/webhooks/[platform]/route.ts    Webhook endpoint for platform adapters
  app/api/chat/route.ts                   Web adapter endpoint when selected
scripts/
  publish.ts                              Publish slash commands (`bun run publish`)
  list.ts                                 List registered slash commands (`bun run commands`)
  clear.ts                                Remove all global slash commands (`bun run clear`)
.env.example                              Required environment variables
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Create a production build |
| `bun run start` | Start the production server |
| `bun run typecheck` | Type-check the project |
| `bun run publish` | Publish (bulk overwrite) Discord slash commands |
| `bun run commands` | List registered Discord slash commands |
| `bun run clear` | Remove every global Discord slash command |

## Learn More

- [Chat SDK Documentation](https://chat-sdk.dev/docs)
- [Adapter Setup Guides](https://chat-sdk.dev/adapters)
- [GitHub Repository](https://github.com/vercel/chat)
