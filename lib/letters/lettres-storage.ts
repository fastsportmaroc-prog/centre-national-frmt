import type { LettreOfficielleRecord } from "@/lib/letters/letter-types";

const LOCAL_KEY = "frmt-lettres-officielles";

export function loadLettresLocal(): LettreOfficielleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as LettreOfficielleRecord[];
  } catch {
    return [];
  }
}

/** Fusionne Supabase + localStorage ; dédoublonne les anciennes lettres (id DB ≠ id client). */
export function mergeRemoteAndLocalLettres(
  remote: LettreOfficielleRecord[],
  local: LettreOfficielleRecord[]
): LettreOfficielleRecord[] {
  const map = new Map<string, LettreOfficielleRecord>();
  for (const r of remote) map.set(r.id, r);

  for (const l of local) {
    const byId = map.get(l.id);
    if (byId) {
      map.set(l.id, { ...byId, ...l, pdf_base64: l.pdf_base64 ?? byId.pdf_base64 });
      continue;
    }
    const stageDup = [...map.values()].find(
      (r) => r.stage_id === l.stage_id && r.id !== l.id
    );
    if (stageDup) {
      map.delete(stageDup.id);
      map.set(l.id, {
        ...stageDup,
        ...l,
        pdf_base64: l.pdf_base64 ?? stageDup.pdf_base64,
      });
    } else {
      map.set(l.id, l);
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function saveLettreLocal(record: LettreOfficielleRecord): void {
  if (typeof window === "undefined") return;
  const list = loadLettresLocal().filter((l) => l.id !== record.id);
  list.unshift(record);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
}

export function deleteLettreLocal(id: string): void {
  if (typeof window === "undefined") return;
  const list = loadLettresLocal().filter((l) => l.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

export function downloadBase64File(
  base64: string,
  mime: string,
  filename: string
): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
