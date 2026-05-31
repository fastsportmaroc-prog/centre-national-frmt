/** Télécharge un fichier distant (photo profil, document…). */
export async function downloadRemoteFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

export function profilePhotoFilename(nom: string, prenom: string, ext = "jpg"): string {
  const base = `${nom}_${prenom}`.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  return `${base || "photo"}_profil.${ext}`;
}

export function guessImageExtension(url: string): string {
  const m = url.match(/\.(jpe?g|png|webp)(\?|$)/i);
  return m?.[1]?.toLowerCase().replace("jpeg", "jpg") ?? "jpg";
}
