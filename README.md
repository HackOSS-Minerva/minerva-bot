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

## Project Structure

```
src/
  lib/bot.ts                              Bot configuration and handlers
  app/api/webhooks/[platform]/route.ts    Webhook endpoint for platform adapters
  app/api/chat/route.ts                   Web adapter endpoint when selected
.env.example                              Required environment variables
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Create a production build |
| `bun run start` | Start the production server |
| `bun run typecheck` | Type-check the project |

## Learn More

- [Chat SDK Documentation](https://chat-sdk.dev/docs)
- [Adapter Setup Guides](https://chat-sdk.dev/adapters)
- [GitHub Repository](https://github.com/vercel/chat)
