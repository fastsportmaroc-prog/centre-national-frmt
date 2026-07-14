import { runSyncClassementsServer } from "../lib/classements-externes/sync-classements.server";

async function main() {
  const mode = (process.argv[2] as "cache" | "rankings" | "api") ?? "cache";
  const summary = await runSyncClassementsServer(mode);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
