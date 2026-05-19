import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import type {
  DossierPasseport,
  DossierPasseportInput,
  DossierPasseportWithJoueur,
  VisaInput,
} from "@/lib/types/passeport";
import { getJoueurs } from "./joueurs";
import {
  buildPasseportVisaAlertes,
  type PasseportAlerte,
} from "@/lib/utils/passeport-alertes";

export async function getPasseportVisaAlertes(): Promise<PasseportAlerte[]> {
  const dossiers = await getDossiersPasseport();
  return buildPasseportVisaAlertes(dossiers);
}

export async function getDossiersPasseport(): Promise<DossierPasseportWithJoueur[]> {
  const [dossiers, joueurs] = await Promise.all([getDossiersRaw(), getJoueurs()]);
  return dossiers.map((d) => {
    const j = joueurs.find((x) => x.id === d.joueur_id);
    return {
      ...d,
      joueur: j
        ? { id: j.id, prenom: j.prenom, nom: j.nom, nationalite: j.nationalite }
        : undefined,
    };
  });
}

async function getDossiersRaw(): Promise<DossierPasseport[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("dossiers_passeport")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DossierPasseport[];
}

export async function getDossierByJoueurId(
  joueurId: string
): Promise<DossierPasseport | null> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("dossiers_passeport")
    .select("*")
    .eq("joueur_id", joueurId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DossierPasseport | null;
}

export async function upsertDossierPasseport(
  input: DossierPasseportInput
): Promise<DossierPasseport> {
  const supabase = await getSupabaseDataClient();
  const existing = await getDossierByJoueurId(input.joueur_id);

  let item: DossierPasseport;
  if (existing) {
    const { data, error } = await supabase
      .from("dossiers_passeport")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    item = data as DossierPasseport;
  } else {
    const { data, error } = await supabase
      .from("dossiers_passeport")
      .insert(input)
      .select()
      .single();
    if (error) throw new Error(error.message);
    item = data as DossierPasseport;
  }

  await logHistorique({
    action: existing ? "modification" : "creation",
    module: "passeport",
    entite_id: item.id,
    entite_label: `Dossier passeport joueur ${input.joueur_id}`,
    ancienne_valeur: null,
    nouvelle_valeur: item.numero_passeport,
    commentaire: null,
  });
  return item;
}

export async function addVisa(
  dossierId: string,
  visa: VisaInput
): Promise<DossierPasseport> {
  const supabase = await getSupabaseDataClient();
  const { data: dossierData, error: fetchError } = await supabase
    .from("dossiers_passeport")
    .select("*")
    .eq("id", dossierId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  const dossier = dossierData as DossierPasseport;
  const visas = [...(dossier.visas ?? []), { ...visa, id: crypto.randomUUID() }];
  const { data, error } = await supabase
    .from("dossiers_passeport")
    .update({ visas, updated_at: new Date().toISOString() })
    .eq("id", dossierId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DossierPasseport;
}

export async function removeVisa(
  dossierId: string,
  visaId: string
): Promise<DossierPasseport> {
  const supabase = await getSupabaseDataClient();
  const { data: dossierData, error: fetchError } = await supabase
    .from("dossiers_passeport")
    .select("*")
    .eq("id", dossierId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  const dossier = dossierData as DossierPasseport;
  const visas = (dossier.visas ?? []).filter((v) => v.id !== visaId);
  const { data, error } = await supabase
    .from("dossiers_passeport")
    .update({ visas, updated_at: new Date().toISOString() })
    .eq("id", dossierId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DossierPasseport;
}
