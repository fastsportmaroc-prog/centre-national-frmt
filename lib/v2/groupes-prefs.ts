export type GroupesViewMode = "categorie" | "birthYear";

const KEY = "frmt-v2:groupes-view-mode";

export function getGroupesViewMode(): GroupesViewMode {
  if (typeof window === "undefined") return "categorie";
  try {
    const v = localStorage.getItem(KEY);
    return v === "birthYear" ? "birthYear" : "categorie";
  } catch {
    return "categorie";
  }
}

export function saveGroupesViewMode(mode: GroupesViewMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent("frmt:groupes-view-changed"));
}
