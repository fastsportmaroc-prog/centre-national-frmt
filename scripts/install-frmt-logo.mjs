import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicPng = path.join(root, "public", "frmt-logo.png");
const embeddedTs = path.join(root, "lib", "brand", "logo-png-embedded.ts");

const sources = [
  path.join(root, "public", "frmt-logo-official.png"),
  path.join(process.env.USERPROFILE || "", ".cursor", "projects", "empty-window", "assets", "frmt-logo-official.png"),
  path.join(process.env.USERPROFILE || "", ".cursor", "projects", "empty-window", "assets", "frmt-logo.png"),
];

let src = process.argv[2];
if (!src) {
  src = sources.find((p) => fs.existsSync(p));
}

if (!src || !fs.existsSync(src)) {
  console.error("Logo source introuvable. Usage: node scripts/install-frmt-logo.mjs <chemin-vers-logo.png>");
  process.exit(1);
}

const buf = fs.readFileSync(src);
fs.writeFileSync(publicPng, buf);
const b64 = buf.toString("base64");
fs.writeFileSync(
  embeddedTs,
  `/** Logo officiel FRMT — généré par scripts/install-frmt-logo.mjs */\nexport const LOGO_PNG_EMBEDDED = "data:image/png;base64,${b64}";\n`
);
console.log("OK:", publicPng, `(${buf.length} octets)`);
