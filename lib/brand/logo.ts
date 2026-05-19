import { LOGO_PNG_PATH, LOGO_SVG_PATH } from "@/lib/constants/branding";

const API_LOGO = "/api/frmt-logo";

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUri(url: string): Promise<{ dataUri: string; format: "PNG" | "SVG" }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Logo: ${res.status}`);
  const blob = await res.blob();
  const dataUri = await blobToDataUri(blob);
  const format =
    blob.type.includes("png") || url.includes(".png") ? "PNG" : "SVG";
  return { dataUri, format };
}

/** Logo officiel pour rapports — PNG embarqué en base64 (impression fiable) */
export async function loadLogoDataUri(): Promise<{
  dataUri: string;
  format: "PNG" | "SVG";
}> {
  if (typeof window === "undefined") {
    throw new Error("loadLogoDataUri: côté client uniquement");
  }

  const urls = [API_LOGO, LOGO_PNG_PATH, LOGO_SVG_PATH];
  for (const url of urls) {
    try {
      return await fetchAsDataUri(url);
    } catch {
      /* essai suivant */
    }
  }

  throw new Error(
    "Logo officiel FRMT introuvable. Ajoutez public/frmt-logo.png (voir public/INSTALL-LOGO.md)."
  );
}

export async function getReportLogoImgHtml(size = 120): Promise<string> {
  const { dataUri } = await loadLogoDataUri();
  return `<img src="${dataUri}" alt="Logo officiel FRMT" class="report-logo" width="${size}" height="${size}" style="object-fit:contain;display:block"/>`;
}
