import { getSupabaseDataClient } from "@/lib/supabase/data-client";

import { guardReadAccess, guardWriteAccess } from "@/lib/supabase/data-access-guard";

import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";

import {

  localGetHebergements,

  localSaveHebergements,

} from "@/lib/local-test/data-access";

import { newLocalId } from "@/lib/local-test/storage";

import type { Hebergement, HebergementInput } from "@/lib/types/database";

import { normalizeHebergementInput } from "@/lib/utils/hebergement";



function sortHebergements(items: Hebergement[]): Hebergement[] {

  return [...items].sort((a, b) => {

    if (a.pavillon !== b.pavillon) return a.pavillon - b.pavillon;

    return a.numero_chambre - b.numero_chambre;

  });

}



function localCreateItem(payload: HebergementInput): Hebergement {

  return {

    id: newLocalId(),

    created_at: new Date().toISOString(),

    nom_chambre: payload.nom_chambre!,

    pavillon: payload.pavillon,

    numero_chambre: payload.numero_chambre,

    type_chambre: payload.type_chambre,

    type_chambre_code: payload.type_chambre_code,

    capacite: payload.capacite,

    occupe: payload.occupe,

  };

}



export async function getHebergements(): Promise<Hebergement[]> {

  if (shouldUseLocalTestStorage()) {

    return sortHebergements(localGetHebergements());

  }

  await guardReadAccess();



  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from("hebergements")

    .select("*")

    .order("pavillon", { ascending: true })

    .order("numero_chambre", { ascending: true });



  if (error) {
    console.warn("[Supabase] hebergements:", error.message);
    return [];
  }

  return (data ?? []) as Hebergement[];
}



export async function createHebergement(input: HebergementInput): Promise<Hebergement> {

  const payload = normalizeHebergementInput(input);



  if (shouldUseLocalTestStorage()) {

    const item = localCreateItem(payload);

    localSaveHebergements([...localGetHebergements(), item]);

    return item;

  }



  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from("hebergements")

    .insert(payload)

    .select()

    .single();

  if (error) throw new Error(error.message);

  return data as Hebergement;

}



export async function getHebergementById(id: string): Promise<Hebergement | null> {

  const all = await getHebergements();

  return all.find((h) => h.id === id) ?? null;

}



export async function updateHebergement(

  id: string,

  input: Partial<HebergementInput>

): Promise<Hebergement> {

  const existing = await getHebergementById(id);

  if (!existing) throw new Error("Chambre introuvable");

  const merged = normalizeHebergementInput({ ...existing, ...input });



  if (shouldUseLocalTestStorage()) {

    const updated: Hebergement = {

      ...existing,

      ...merged,

      nom_chambre: merged.nom_chambre!,

    };

    localSaveHebergements(

      localGetHebergements().map((h) => (h.id === id ? updated : h))

    );

    return updated;

  }



  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { data, error } = await supabase

    .from("hebergements")

    .update(merged)

    .eq("id", id)

    .select()

    .single();

  if (error) throw new Error(error.message);

  return data as Hebergement;

}



export async function deleteHebergement(id: string): Promise<void> {

  if (shouldUseLocalTestStorage()) {

    localSaveHebergements(localGetHebergements().filter((h) => h.id !== id));

    return;

  }



  await guardWriteAccess();

  const supabase = await getSupabaseDataClient();

  const { error } = await supabase.from("hebergements").delete().eq("id", id);

  if (error) throw new Error(error.message);

}


