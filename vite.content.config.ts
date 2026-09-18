import { resolve } from "node:path";
import { defineConfig } from "vite";

/** Content script: one self-contained IIFE, injected on demand via chrome.scripting. */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "chrome116",
    lib: {
      entry: resolve(import.meta.dirname, "src/content/index.ts"),
      formats: ["iife"],
      name: "ChatArchiveContent",
      fileName: () => "content.js"
    }
  }
});
