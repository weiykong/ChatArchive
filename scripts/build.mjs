#!/usr/bin/env node
/**
 * Build script for ChatArchive extension.
 * Builds all entry points via Vite, then runs package-extension.js to create the zip.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { cwd: root, stdio: "inherit", shell: true, ...opts });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

console.log("🔨 Building ChatArchive extension...");

// 1. Build ES module entry points (service worker, popup, sidepanel, offscreen)
console.log("📦 Building ES modules (service worker, popup, sidepanel, offscreen)...");
run(`npx vite build --config ${resolve(root, "vite.config.ts")}`);

// 2. Build content script (IIFE)
console.log("📦 Building content script (IIFE)...");
run(`npx vite build --config ${resolve(root, "vite.content.config.ts")}`);

console.log("✅ Build complete. Output in dist/");