import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Inyecta en dist/sw.js los bundles generados para garantizar apertura offline completa. */
function swOfflinePrecache(): Plugin {
  return {
    name: "sw-offline-precache",
    apply: "build",
    closeBundle() {
      const distDir = resolve(import.meta.dirname, "dist");
      const swPath = resolve(distDir, "sw.js");
      if (!existsSync(swPath)) return;

      const assetsDir = resolve(distDir, "assets");
      const buildAssets: string[] = [];
      if (existsSync(assetsDir)) {
        for (const file of readdirSync(assetsDir)) {
          if (!file.startsWith(".")) buildAssets.push(`/assets/${file}`);
        }
      }

      const cacheVersion = `calendarappio-shell-${Date.now()}`;
      const swContent = readFileSync(swPath, "utf8")
        .replace("__CALENDARAPPIO_CACHE_VERSION__", cacheVersion)
        .replace(
          "// __BUILD_ASSETS_INJECT__",
          `self.__BUILD_ASSETS = ${JSON.stringify(buildAssets)};`,
        );

      writeFileSync(swPath, swContent, "utf8");
    },
  };
}

export default defineConfig({
  plugins: [react(), swOfflinePrecache()],
});
