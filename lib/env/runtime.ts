/** true en build production (Vercel inclus). */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}
