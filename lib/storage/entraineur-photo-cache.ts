const PREFIX = "frmt_entraineur_photo_";

export function cacheEntraineurPhotoUrl(entraineurId: string, url: string): void {
  if (typeof window === "undefined" || !url.startsWith("http")) return;
  try {
    localStorage.setItem(`${PREFIX}${entraineurId}`, url);
  } catch {
    /* quota / mode privé */
  }
}

export function readCachedEntraineurPhotoUrl(entraineurId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${PREFIX}${entraineurId}`);
  } catch {
    return null;
  }
}

/** URL affichable (cache local si la base n’a pas encore photo_url). */
export function resolveEntraineurPhotoUrl(
  entraineurId: string,
  photoUrl?: string | null
): string | null {
  const fromDb = photoUrl?.trim();
  if (fromDb) return fromDb;
  return readCachedEntraineurPhotoUrl(entraineurId);
}

export function photoUrlWithCacheBust(url: string): string {
  if (url.startsWith("blob:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

// Alias générique (joueur / entraîneur)
export { photoUrlWithCacheBust as withPhotoCacheBust };
