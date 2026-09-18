const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outputDirectory = path.join(root, "dist");
const outputFile = path.join(outputDirectory, `chatarchive-${packageJson.version}.zip`);

// Files and directories to include in the extension zip
const entries = [
  "manifest.json",
  "popup.html",
  "sidepanel.html",
  "offscreen.html",
  "assets",
  "LICENSE",
  // Vite outputs these to dist/
  "service-worker.js",
  "popup.js",
  "sidepanel.js",
  "offscreen.js",
  "chunks",
  "content.js",
  "print.html",
  "print.js"
];

fs.mkdirSync(outputDirectory, { recursive: true });
fs.rmSync(outputFile, { force: true });

const result = spawnSync("zip", ["-rq", outputFile, ...entries], {
  cwd: outputDirectory,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

process.stdout.write(`${path.relative(root, outputFile)}\n`);