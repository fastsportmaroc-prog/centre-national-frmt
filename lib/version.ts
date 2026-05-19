/** Version applicative Centre National FRMT — incrémenter à chaque release */

export const APP_VERSION = "1.2.0";
export const APP_CODENAME = "Atlas";
export const BUILD_DATE = "2026-05-17";

export function versionLabel(): string {
  return `v${APP_VERSION} (${APP_CODENAME})`;
}
