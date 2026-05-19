import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const log = [];

function run(cmd) {
  log.push(`\n$ ${cmd}\n`);
  try {
    const out = execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    log.push(out);
    return 0;
  } catch (e) {
    log.push(e.stdout ?? "");
    log.push(e.stderr ?? "");
    return e.status ?? 1;
  }
}

const code = run("npm run build");
writeFileSync(join(root, "build-result.txt"), log.join(""), "utf8");
process.exit(code);
