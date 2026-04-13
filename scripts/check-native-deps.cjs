#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const platform = process.platform;
const arch = process.arch;
const currentNodeVersion = process.versions.node;
const nvmrcPath = path.join(repoRoot, ".nvmrc");

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

function normalizeVersion(version) {
  return version.trim().replace(/^v/, "");
}

function compareVersions(a, b) {
  const left = normalizeVersion(a).split(".").map(Number);
  const right = normalizeVersion(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const leftPart = left[i] ?? 0;
    const rightPart = right[i] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
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

const expectedNodeVersion = fs.existsSync(nvmrcPath)
  ? normalizeVersion(fs.readFileSync(nvmrcPath, "utf8"))
  : null;

const nodeMismatch =
  expectedNodeVersion && compareVersions(currentNodeVersion, expectedNodeVersion) < 0
    ? {
        current: currentNodeVersion,
        expected: expectedNodeVersion,
      }
    : null;

if (mismatches.length === 0 && !nodeMismatch) {
  process.exit(0);
}

const deleteCommand =
  platform === "win32"
    ? "rmdir /s /q node_modules"
    : "rm -rf node_modules";

if (nodeMismatch) {
  console.error("");
  console.error("Node.js version mismatch detected for this checkout.");
  console.error(
    `This repo expects Node ${nodeMismatch.expected} from .nvmrc, but this shell is running Node ${nodeMismatch.current}.`
  );
  console.error("");
  console.error("Fix:");
  console.error(`1. Switch Node versions in this shell to ${nodeMismatch.expected}`);
  console.error("2. Re-run npm install if you previously installed with a different Node major version");
  console.error("3. Start the dev server again from that same shell or IDE terminal");
}

if (mismatches.length > 0) {
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
}

process.exit(1);
