import { getOfficialLogoDataUri, getOfficialLogoImgHtml } from "@/lib/brand/print-logo";

/** Logo officiel pour rapports — PNG embarqué en base64 (impression fiable). */
export async function loadLogoDataUri(): Promise<{
  dataUri: string;
  format: "PNG" | "SVG";
}> {
  return { dataUri: getOfficialLogoDataUri(), format: "PNG" };
}

export async function getReportLogoImgHtml(size = 120): Promise<string> {
  return getOfficialLogoImgHtml(size);
}
