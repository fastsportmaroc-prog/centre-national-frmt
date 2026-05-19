#!/usr/bin/env node
/**
 * Snapshot projet FRMT avant modification majeure — rollback manuel possible.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIRS = ["app", "components", "lib", "data", "supabase/migrations"];
const FILES = ["package.json", "CHANGELOG.md", "tsconfig.json"];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === "node_modules" || name === ".next") continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const stamp =
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_") ||
  Date.now().toString();
const out = path.join(ROOT, "backups", "snapshots", stamp);
fs.mkdirSync(out, { recursive: true });

for (const d of DIRS) {
  copyRecursive(path.join(ROOT, d), path.join(out, d));
}
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(out, f));
  }
}

const meta = {
  created_at: new Date().toISOString(),
  dirs: DIRS,
  files: FILES,
  note: "Restauration manuelle — voir backups/README.md",
};
fs.writeFileSync(path.join(out, "snapshot-meta.json"), JSON.stringify(meta, null, 2));

console.log(`✓ Snapshot créé : backups/snapshots/${path.basename(out)}`);
