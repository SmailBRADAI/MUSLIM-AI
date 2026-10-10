import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // The manifest lives in public/manifest.webmanifest and is linked from index.html.
      manifest: false,
      workbox: {
        // Precache the whole build, fonts included, so a fresh install works in airplane mode.
        globPatterns: ["**/*.{js,css,html,svg,webp,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "index.html",
        // T051: handles taps on the lock-screen card; see public/sw-extra.js.
        importScripts: ["sw-extra.js"],
      },
    }),
  ],
});
