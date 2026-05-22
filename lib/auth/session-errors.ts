/** Erreurs Supabase Auth liées à un refresh token invalide ou expiré. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    if (typeof error === "string") {
      return isInvalidRefreshTokenMessage(error);
    }
    return false;
  }

  const e = error as {
    message?: string;
    code?: string;
    status?: number;
    name?: string;
  };

  if (e.code === "refresh_token_not_found") return true;
  if (e.name === "AuthApiError" && isInvalidRefreshTokenMessage(e.message ?? "")) {
    return true;
  }
  return isInvalidRefreshTokenMessage(e.message ?? "");
}

function isInvalidRefreshTokenMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid refresh token") ||
    m.includes("refresh token not found") ||
    m.includes("refresh_token_not_found") ||
    m.includes("session not found") ||
    m.includes("auth session missing")
  );
}
