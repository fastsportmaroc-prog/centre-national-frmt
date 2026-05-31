/**
 * Convertit public/logo-frmt.png en module TypeScript base64 (sans redimensionnement).
 * Usage: node scripts/convert-logo-base64.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "logo-frmt.png");
const outPath = path.join(root, "lib", "brand", "logo-frmt-base64.ts");

if (!fs.existsSync(logoPath)) {
  console.error(`Fichier introuvable: ${logoPath}`);
  console.error("Placez le logo officiel dans public/logo-frmt.png puis relancez.");
  process.exit(1);
}

const buf = fs.readFileSync(logoPath);
const b64 = buf.toString("base64");
const content = `/** Logo officiel FRMT — généré par scripts/convert-logo-base64.js — ne pas modifier à la main */
export const LOGO_FRMT_PNG_DATA_URI =
  "data:image/png;base64,${b64}";
`;

fs.writeFileSync(outPath, content, "utf-8");
console.log(`OK: ${outPath} (${buf.length} octets, PNG inchangé)`);
