#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const platform = process.platform;
const arch = process.arch;

const esbuildTargets = {
  "darwin:arm64": "darwin-arm64",
  "darwin:x64": "darwin-x64",
  "linux:arm64": "linux-arm64",
  "linux:x64": "linux-x64",
  "win32:arm64": "win32-arm64",
  "win32:ia32": "win32-ia32",
  "win32:x64": "win32-x64",
};

const rollupTargets = {
  "darwin:arm64": "rollup-darwin-arm64",
  "darwin:x64": "rollup-darwin-x64",
  "linux:arm64": "rollup-linux-arm64-gnu",
  "linux:x64": "rollup-linux-x64-gnu",
  "win32:arm64": "rollup-win32-arm64-msvc",
  "win32:ia32": "rollup-win32-ia32-msvc",
  "win32:x64": "rollup-win32-x64-msvc",
};

function readEntries(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function findMismatch(name, expected, dirs) {
  if (!expected) {
    return null;
  }

  const installed = dirs.flatMap(readEntries);
  if (installed.length === 0 || installed.includes(expected)) {
    return null;
  }

  return { name, expected, installed };
}

const mismatches = [
  findMismatch("esbuild", esbuildTargets[`${platform}:${arch}`], [
    path.join(repoRoot, "node_modules", "@esbuild"),
  ]),
  findMismatch("rollup", rollupTargets[`${platform}:${arch}`], [
    path.join(repoRoot, "node_modules", "@rollup"),
    path.join(repoRoot, "node_modules", "rollup", "node_modules", "@rollup"),
  ]),
].filter(Boolean);

if (mismatches.length === 0) {
  process.exit(0);
}

const deleteCommand =
  platform === "win32"
    ? "rmdir /s /q node_modules"
    : "rm -rf node_modules";

console.error("");
console.error("Native dependency mismatch detected for this checkout.");
console.error(
  `This repo's node_modules were installed for a different platform than ${platform}/${arch}.`
);

for (const mismatch of mismatches) {
  console.error(
    `- ${mismatch.name}: expected ${mismatch.expected}, found ${mismatch.installed.join(", ")}`
  );
}

console.error("");
console.error("Fix:");
console.error(`1. From the repo root, run: ${deleteCommand}`);
console.error("2. Reinstall dependencies from the same shell/OS you plan to use: npm install");
console.error("3. Re-run your dev command from that same environment");
console.error("");
console.error(
  "Tip: avoid sharing one node_modules between Windows and WSL. Use one environment consistently or keep separate checkouts."
);

process.exit(1);
