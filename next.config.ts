import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@chat-adapter/discord",
    "@chat-adapter/state-memory",
    "chat",
  ],
  serverExternalPackages: [
    "@discordjs/voice",
    "@discordjs/ws",
    "bufferutil",
    "discord.js",
    "utf-8-validate",
    "zlib-sync",
  ],
};

export default nextConfig;
