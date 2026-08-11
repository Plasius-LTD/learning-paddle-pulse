#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = process.cwd();
const cache = path.join(root, ".npm-cache-packcheck");
const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache],
    { cwd: root, encoding: "utf8" },
  ),
);
const paths = (packed[0]?.files ?? []).map((entry) => entry.path);
const required = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/browser-worker.js",
  "dist/browser-worker.cjs",
  "dist/browser-worker.d.ts",
  "dist/server.js",
  "dist/server.cjs",
  "dist/server.d.ts",
  "README.md",
  "CHANGELOG.md",
  "THIRD_PARTY_NOTICES.md",
];
const missing = required.filter((entry) => !paths.includes(entry));
if (missing.length > 0) {
  throw new Error(`Public package is missing: ${missing.join(", ")}`);
}

const packageJson = require(path.join(root, "package.json"));
for (const exportName of [".", "./browser-worker", "./server"]) {
  if (!packageJson.exports?.[exportName]) {
    throw new Error(`Missing package export ${exportName}`);
  }
}

const rootCjs = require(path.join(root, "dist/index.cjs"));
const browserCjs = require(path.join(root, "dist/browser-worker.cjs"));
const serverCjs = require(path.join(root, "dist/server.cjs"));
if (typeof rootCjs.executePaddlePulseProject !== "function") {
  throw new Error("Root CommonJS evaluator export is unavailable");
}
if (Object.hasOwn(rootCjs, "assessPaddlePulseProject")) {
  throw new Error("Server assessment leaked into the root export");
}
if (typeof browserCjs.createPaddlePulseWorkerMessageHandler !== "function") {
  throw new Error("Browser worker CommonJS export is unavailable");
}
if (typeof serverCjs.assessPaddlePulseProject !== "function") {
  throw new Error("Server CommonJS assessment export is unavailable");
}

if (rootCjs.PADDLE_PULSE_MODULE_V2?.missions?.flatMap((mission) => mission.stages).length !== 54) {
  throw new Error("The immutable 54-stage content export is unavailable");
}

const forbidden = paths.filter((entry) =>
  /(?:^|\/)(?:node_modules|coverage|frontend|backend|infra|local\.settings\.json)(?:\/|$)/iu.test(entry),
);
if (forbidden.length > 0) {
  throw new Error(`Forbidden public paths: ${forbidden.join(", ")}`);
}
