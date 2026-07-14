#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[t.slice(0, i).trim()] = val;
  }
}

// Dynamic import won't work for server-only TS - use child process with tsx or npx tsx
const { spawnSync } = await import("child_process");
const result = spawnSync(
  "npx",
  ["-y", "tsx", join(root, "scripts", "run-sync-server-once.ts")],
  { cwd: root, env: process.env, encoding: "utf8", shell: true }
);
console.log(result.stdout || "");
if (result.stderr) console.error(result.stderr);
process.exit(result.status ?? 1);
