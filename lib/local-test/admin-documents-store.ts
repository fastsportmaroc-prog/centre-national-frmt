import type { AdminDocument, AdminDocumentInput } from "@/lib/types/admin-document";
import { readJson, writeJson, newLocalId } from "./storage";

const KEY = "documents_administratifs";

function now() {
  return new Date().toISOString();
}

export function localGetAdminDocuments(): AdminDocument[] {
  return readJson<AdminDocument[]>(KEY, []);
}

function saveAll(docs: AdminDocument[]) {
  writeJson(KEY, docs);
}

export function localCreateAdminDocument(input: AdminDocumentInput): AdminDocument {
  const t = now();
  const doc: AdminDocument = {
    id: newLocalId(),
    ...input,
    created_at: t,
    updated_at: t,
  };
  const all = localGetAdminDocuments();
  saveAll([doc, ...all]);
  return doc;
}

export function localUpdateAdminDocument(
  id: string,
  patch: Partial<AdminDocumentInput>
): AdminDocument | null {
  const all = localGetAdminDocuments();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const updated: AdminDocument = {
    ...all[idx]!,
    ...patch,
    updated_at: now(),
  };
  all[idx] = updated;
  saveAll(all);
  return updated;
}

export function localDeleteAdminDocument(id: string): boolean {
  const all = localGetAdminDocuments();
  const next = all.filter((d) => d.id !== id);
  if (next.length === all.length) return false;
  saveAll(next);
  return true;
}
