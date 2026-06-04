/** Erreurs Supabase lorsque la table programmation_evenements n'est pas encore migrée. */
export function isProgrammationTableMissingError(message: string): boolean {
  return /programmation_evenements|schema cache|could not find the table/i.test(message);
}

export const PROGRAMMATION_MIGRATION_HINT =
  "La table programmation_evenements est absente en base. Exécutez le fichier lib/db/migrations/programmation_evenements.sql dans Supabase → SQL Editor, puis rechargez le schéma API.";

export function normalizeProgrammationDbError(message: string): {
  error: string;
  migrationRequired: boolean;
} {
  if (isProgrammationTableMissingError(message)) {
    return { error: PROGRAMMATION_MIGRATION_HINT, migrationRequired: true };
  }
  return { error: message, migrationRequired: false };
}
