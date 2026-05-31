import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicPng = path.join(root, "public", "logo-frmt.png");
const publicPngAlias = path.join(root, "public", "frmt-logo.png");
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
fs.writeFileSync(publicPngAlias, buf);
const b64 = buf.toString("base64");
const base64Out = path.join(root, "lib", "brand", "logo-frmt-base64.ts");
fs.writeFileSync(
  base64Out,
  `/** Logo officiel FRMT — généré par scripts/install-frmt-logo.mjs */\nexport const LOGO_FRMT_PNG_DATA_URI = "data:image/png;base64,${b64}";\n`
);
if (fs.existsSync(embeddedTs)) {
  fs.writeFileSync(
    embeddedTs,
    `/** @deprecated Utiliser lib/brand/logo-frmt-base64.ts */\nexport { LOGO_FRMT_PNG_DATA_URI as LOGO_PNG_EMBEDDED } from "./logo-frmt-base64";\n`
  );
}
console.log("OK:", publicPng, publicPngAlias, base64Out, `(${buf.length} octets)`);
