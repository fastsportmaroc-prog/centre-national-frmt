export const SUPABASE_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Récupère toutes les lignes d'une requête Supabase (contourne la limite par défaut de 1000).
 */
export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  onError?: (message: string) => void
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await build(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) {
      onError?.(error.message);
      break;
    }
    const page = data ?? [];
    all.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

export function applyReservationDateRange<
  Q extends {
    gte(column: string, value: string): Q;
    lte(column: string, value: string): Q;
  },
>(q: Q, dateDebut?: string, dateFin?: string): Q {
  const d0 = dateDebut?.slice(0, 10);
  const d1 = dateFin?.slice(0, 10);
  if (d0) q = q.gte("date_debut", `${d0}T00:00:00`);
  if (d1) q = q.lte("date_debut", `${d1}T23:59:59`);
  return q;
}

/** Chevauchement de période : inclut toute réservation qui tombe dans [dateDebut, dateFin]. */
export function applyReservationDateRangeOverlap<
  Q extends {
    gte(column: string, value: string): Q;
    lte(column: string, value: string): Q;
  },
>(q: Q, dateDebut?: string, dateFin?: string): Q {
  const d0 = dateDebut?.slice(0, 10);
  const d1 = dateFin?.slice(0, 10);
  if (d0) q = q.gte("date_fin", `${d0}T00:00:00`);
  if (d1) q = q.lte("date_debut", `${d1}T23:59:59`);
  return q;
}

/**
 * Filtre par jour de début (créneaux journaliers terrain).
 * Évite d'exclure des lignes dont date_fin est absente ou incohérente.
 */
export function applyReservationDateRangeByStartDay<
  Q extends {
    gte(column: string, value: string): Q;
    lte(column: string, value: string): Q;
  },
>(q: Q, dateDebut?: string, dateFin?: string): Q {
  const d0 = dateDebut?.slice(0, 10);
  const d1 = dateFin?.slice(0, 10);
  if (d0) q = q.gte("date_debut", `${d0}T00:00:00`);
  if (d1) q = q.lte("date_debut", `${d1}T23:59:59`);
  return q;
}
