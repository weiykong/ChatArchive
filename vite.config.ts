import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Builds everything that runs as an ES module: the service worker, the popup,
 * the side panel and the offscreen document. The content script is an IIFE and
 * has its own config (vite.content.config.ts) because Rollup cannot emit IIFE
 * and ES output from one multi-entry build.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "chrome116",
    modulePreload: false,
    rollupOptions: {
      input: {
        "service-worker": resolve(__dirname, "src/background/service-worker.ts"),
        popup: resolve(__dirname, "popup.html"),
        sidepanel: resolve(__dirname, "sidepanel.html"),
        offscreen: resolve(__dirname, "offscreen.html")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});