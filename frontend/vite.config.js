import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Reading Companion",
        short_name: "Reading",
        description: "A friend who reads with you.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0B14",
        theme_color: "#0A0B14",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        importScripts: ["push-sw.js"],
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DOCS_BUILT_AT__: JSON.stringify(new Date().toISOString()),
    __DOCS_COMMIT__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7)),
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});