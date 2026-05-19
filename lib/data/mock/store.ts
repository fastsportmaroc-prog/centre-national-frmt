import type {
  Court,
  CourtInput,
  Groupe,
  GroupeInput,
  Hebergement,
  HebergementInput,
  Joueur,
  JoueurInput,
  Repas,
  Reservation,
  ReservationInput,
} from "@/lib/types/database";
import type {
  DemandeBilletAvion,
  DemandeBilletAvionInput,
  DemandeLogistique,
  DemandeLogistiqueInput,
} from "@/lib/types/logistique";
import type { HistoriqueEntry, HistoriqueInput } from "@/lib/types/historique";
import type { JoueurDepense, JoueurDepenseInput } from "@/lib/types/joueur-depenses";
import type {
  DossierPasseport,
  DossierPasseportInput,
  VisaInput,
} from "@/lib/types/passeport";
import { seedHebergements } from "./seed-hebergement";
import {
  seedCourts,
  seedGroupes,
  seedJoueurs,
  seedRepas,
  seedReservations,
} from "./seed";
import { seedBilletsAvion, seedDemandesLogistique } from "./seed-logistique";
import { seedJoueurDepenses } from "./seed-depenses";
import {
  seedBesoinsRestauration,
  seedFacturesRestauration,
  seedPrestatairesRestauration,
} from "./seed-restauration";
import { seedStagesProgramme } from "./seed-stages";
import { seedOccupationCne } from "./seed-occupation-cne";
import { seedImportHistory, seedSystemLogs } from "./seed-system";
import type { ImportHistoryEntry, ImportHistoryInput, SystemLogEntry, SystemLogInput } from "@/lib/types/system";
import {
  seedDisponibilitesEntraineur,
  seedEntraineurDepenses,
  seedEntraineurs,
  seedMissionsEntraineur,
} from "./seed-entraineurs";
import { seedBudgetAnnuel } from "./seed-budget";
import { seedFrmtClassementJoueurs } from "./seed-frmt-classement";
import type {
  DisponibiliteEntraineur,
  DisponibiliteEntraineurInput,
  Entraineur,
  EntraineurDepense,
  EntraineurDepenseInput,
  EntraineurInput,
  MissionEntraineur,
  MissionEntraineurInput,
} from "@/lib/types/entraineurs";
import type { BudgetAnnuelLigne, BudgetAnnuelLigneInput } from "@/lib/types/budget";
import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";
import type { OccupationCneInput, OccupationCneSnapshot } from "@/lib/types/occupation-cne";
import type {
  BesoinRestauration,
  BesoinRestaurationInput,
  FactureRestauration,
  FactureRestaurationInput,
  PrestataireRestauration,
  PrestataireRestaurationInput,
} from "@/lib/types/restauration";
import { seedHistorique } from "./seed-historique";
import { seedDossiersPasseport } from "./seed-passeport";
import {
  seedJoueursMarocains,
  seedPerformanceMatchs,
  seedPerformancePalmares,
  seedPerformanceProchains,
  seedPerformanceRankings,
  seedPerformanceTournois,
  seedPerformanceEvolution,
  seedPerformanceSurfaces,
} from "./seed-performances";
import type {
  MatchPerformance,
  PalmaresEntry,
  ProchainMatch,
  RankingSnapshot,
  TournoiJoueur,
} from "@/lib/types/performances";
import type { PerformanceSyncPayload } from "@/lib/tennis/provider";
import type { EvolutionClassement, StatsSurface } from "@/lib/types/performances";

function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

let groupes = clone(seedGroupes);
/** Joueurs centre national : classement FRMT (79) + démo + seniors performances */
let joueurs = clone([
  ...seedFrmtClassementJoueurs,
  ...seedJoueursMarocains,
  ...seedJoueurs,
]);
let courts = clone(seedCourts);
let reservations = clone(seedReservations);
let hebergements = clone(seedHebergements);
let repas = clone(seedRepas);
let demandesLogistique = clone(seedDemandesLogistique);
let billetsAvion = clone(seedBilletsAvion);
let joueurDepenses = clone(seedJoueurDepenses);
let prestatairesRestauration = clone(seedPrestatairesRestauration);
let besoinsRestauration = clone(seedBesoinsRestauration);
let facturesRestauration = clone(seedFacturesRestauration);
let stagesProgramme = clone(seedStagesProgramme);
let occupationCne = clone(seedOccupationCne);
let importHistory = clone(seedImportHistory);
let systemLogs = clone(seedSystemLogs);
let entraineurs = clone(seedEntraineurs);
let missionsEntraineur = clone(seedMissionsEntraineur);
let entraineurDepenses = clone(seedEntraineurDepenses);
let disponibilitesEntraineur = clone(seedDisponibilitesEntraineur);
let budgetAnnuel = clone(seedBudgetAnnuel);
let historique = clone(seedHistorique);
let dossiersPasseport = clone(seedDossiersPasseport);
let performanceRankings = clone(seedPerformanceRankings);
let performanceMatchs = clone(seedPerformanceMatchs);
let performanceProchains = clone(seedPerformanceProchains);
let performanceTournois = clone(seedPerformanceTournois);
let performancePalmares = clone(seedPerformancePalmares);
let performanceEvolutionRuntime: Record<string, EvolutionClassement[]> | null = null;
let performanceSurfacesRuntime: Record<string, StatsSurface[]> | null = null;
let performanceSyncMeta: {
  provider: string;
  synced_at: string;
} | null = {
  provider: "Mock FRMT (données marocaines)",
  synced_at: new Date().toISOString(),
};

function newId(): string {
  return crypto.randomUUID();
}

export const mockStore = {
  getGroupes: () => [...groupes],
  getGroupe: (id: string) => groupes.find((g) => g.id === id),
  createGroupe: (input: GroupeInput) => {
    const item: Groupe = { ...input, id: newId(), created_at: new Date().toISOString() };
    groupes = [item, ...groupes];
    return item;
  },
  updateGroupe: (id: string, input: Partial<GroupeInput>) => {
    const i = groupes.findIndex((g) => g.id === id);
    if (i === -1) return null;
    groupes[i] = { ...groupes[i], ...input };
    return groupes[i];
  },
  deleteGroupe: (id: string) => {
    groupes = groupes.filter((g) => g.id !== id);
    joueurs = joueurs.map((j) =>
      j.groupe_id === id ? { ...j, groupe_id: null } : j
    );
    return true;
  },
  countJoueursByGroupe: (groupeId: string) =>
    joueurs.filter((j) => j.groupe_id === groupeId).length,

  getJoueurs: () => [...joueurs],
  getJoueur: (id: string) => joueurs.find((j) => j.id === id),
  createJoueur: (input: JoueurInput) => {
    const item: Joueur = { ...input, id: newId(), created_at: new Date().toISOString() };
    joueurs = [item, ...joueurs];
    return item;
  },
  updateJoueur: (id: string, input: Partial<JoueurInput>) => {
    const i = joueurs.findIndex((j) => j.id === id);
    if (i === -1) return null;
    joueurs[i] = { ...joueurs[i], ...input };
    return joueurs[i];
  },
  deleteJoueur: (id: string) => {
    joueurs = joueurs.filter((j) => j.id !== id);
    reservations = reservations.filter((r) => r.joueur_id !== id);
    return true;
  },
  mergeFrmtClassementJoueurs: (incoming: Joueur[]) => {
    let added = 0;
    for (const j of incoming) {
      const birthYear = j.date_naissance.slice(0, 4);
      const exists = joueurs.some(
        (x) =>
          x.id === j.id ||
          (x.nom.toLowerCase() === j.nom.toLowerCase() &&
            x.prenom.toLowerCase() === j.prenom.toLowerCase() &&
            x.date_naissance.startsWith(birthYear))
      );
      if (exists) continue;
      joueurs = [j, ...joueurs];
      added++;
    }
    return { added, total: joueurs.length };
  },

  /** Réinjecte le top 5 FRMT WB27 si la liste a été réduite (ex. sync performances). */
  ensureFrmtClassementJoueurs: () => {
    const expected = seedFrmtClassementJoueurs.length;
    const presentBefore = joueurs.filter((j) => j.id.startsWith("frmt-")).length;
    if (presentBefore >= expected) {
      return { added: 0, total: joueurs.length, expected, present: presentBefore };
    }
    let added = 0;
    for (const j of seedFrmtClassementJoueurs) {
      if (joueurs.some((x) => x.id === j.id)) continue;
      joueurs = [j, ...joueurs];
      added++;
    }
    return {
      added,
      total: joueurs.length,
      expected,
      present: joueurs.filter((x) => x.id.startsWith("frmt-")).length,
    };
  },

  getCourts: () => [...courts],
  getCourt: (id: string) => courts.find((c) => c.id === id),
  createCourt: (input: CourtInput) => {
    const item: Court = { ...input, id: newId(), created_at: new Date().toISOString() };
    courts = [item, ...courts];
    return item;
  },
  updateCourt: (id: string, input: Partial<CourtInput>) => {
    const i = courts.findIndex((c) => c.id === id);
    if (i === -1) return null;
    courts[i] = { ...courts[i], ...input };
    return courts[i];
  },
  deleteCourt: (id: string) => {
    courts = courts.filter((c) => c.id !== id);
    reservations = reservations.filter((r) => r.court_id !== id);
    return true;
  },
  clearReservationsForCourt: (courtId: string) => {
    reservations = reservations.filter((r) => r.court_id !== courtId);
  },

  getReservations: () => [...reservations],
  getReservation: (id: string) => reservations.find((r) => r.id === id),
  createReservation: (input: ReservationInput) => {
    const ts = new Date().toISOString();
    const item: Reservation = {
      ...input,
      id: newId(),
      created_at: ts,
      updated_at: ts,
    };
    reservations = [item, ...reservations];
    return item;
  },
  updateReservation: (id: string, input: Partial<ReservationInput>) => {
    const i = reservations.findIndex((r) => r.id === id);
    if (i === -1) return null;
    reservations[i] = {
      ...reservations[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return reservations[i];
  },
  deleteReservation: (id: string) => {
    reservations = reservations.filter((r) => r.id !== id);
    return true;
  },

  getHebergements: () =>
    [...hebergements].sort(
      (a, b) =>
        a.pavillon - b.pavillon || a.numero_chambre - b.numero_chambre
    ),
  getHebergement: (id: string) => hebergements.find((h) => h.id === id),
  createHebergement: (input: HebergementInput) => {
    const item: Hebergement = {
      ...input,
      nom_chambre:
        input.nom_chambre ??
        `Pavillon ${input.pavillon} — Chambre ${input.numero_chambre}`,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    hebergements = [item, ...hebergements];
    return item;
  },
  updateHebergement: (id: string, input: Partial<HebergementInput>) => {
    const i = hebergements.findIndex((h) => h.id === id);
    if (i === -1) return null;
    hebergements[i] = { ...hebergements[i], ...input };
    return hebergements[i];
  },
  deleteHebergement: (id: string) => {
    hebergements = hebergements.filter((h) => h.id !== id);
    return true;
  },
  getRepas: () => [...repas],

  getPrestatairesRestauration: () => [...prestatairesRestauration],
  getPrestataireRestauration: (id: string) =>
    prestatairesRestauration.find((p) => p.id === id),
  createPrestataireRestauration: (input: PrestataireRestaurationInput) => {
    const item: PrestataireRestauration = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    prestatairesRestauration = [item, ...prestatairesRestauration];
    return item;
  },
  updatePrestataireRestauration: (id: string, input: Partial<PrestataireRestaurationInput>) => {
    const i = prestatairesRestauration.findIndex((p) => p.id === id);
    if (i === -1) return null;
    prestatairesRestauration[i] = { ...prestatairesRestauration[i], ...input };
    return prestatairesRestauration[i];
  },
  deletePrestataireRestauration: (id: string) => {
    const hasFactures = facturesRestauration.some((f) => f.prestataire_id === id);
    if (hasFactures) {
      throw new Error(
        "Impossible de supprimer : des factures sont encore liées à ce prestataire. Supprimez-les d'abord."
      );
    }
    besoinsRestauration = besoinsRestauration.map((b) =>
      b.prestataire_id === id
        ? { ...b, prestataire_id: null, prestataire_nom: null, updated_at: new Date().toISOString() }
        : b
    );
    const before = prestatairesRestauration.length;
    prestatairesRestauration = prestatairesRestauration.filter((p) => p.id !== id);
    return prestatairesRestauration.length < before;
  },

  getBesoinsRestauration: () =>
    [...besoinsRestauration].sort((a, b) => b.date_besoin.localeCompare(a.date_besoin)),
  getBesoinRestauration: (id: string) => besoinsRestauration.find((b) => b.id === id),
  createBesoinRestauration: (
    input: BesoinRestaurationInput & { prestataire_nom?: string | null }
  ) => {
    const ts = new Date().toISOString();
    const item: BesoinRestauration = {
      ...input,
      prestataire_nom: input.prestataire_nom ?? null,
      id: newId(),
      created_at: ts,
      updated_at: ts,
    };
    besoinsRestauration = [item, ...besoinsRestauration];
    return item;
  },
  updateBesoinRestauration: (
    id: string,
    input: Partial<BesoinRestaurationInput & { prestataire_nom?: string | null }>
  ) => {
    const i = besoinsRestauration.findIndex((b) => b.id === id);
    if (i === -1) return null;
    besoinsRestauration[i] = {
      ...besoinsRestauration[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return besoinsRestauration[i];
  },
  deleteBesoinRestauration: (id: string) => {
    besoinsRestauration = besoinsRestauration.filter((b) => b.id !== id);
    return true;
  },

  getFacturesRestauration: () =>
    [...facturesRestauration].sort((a, b) => b.date_facture.localeCompare(a.date_facture)),
  getFactureRestauration: (id: string) => facturesRestauration.find((f) => f.id === id),
  createFactureRestauration: (input: FactureRestaurationInput) => {
    const ts = new Date().toISOString();
    const item: FactureRestauration = { ...input, id: newId(), created_at: ts, updated_at: ts };
    facturesRestauration = [item, ...facturesRestauration];
    return item;
  },
  updateFactureRestauration: (id: string, input: Partial<FactureRestaurationInput>) => {
    const i = facturesRestauration.findIndex((f) => f.id === id);
    if (i === -1) return null;
    facturesRestauration[i] = {
      ...facturesRestauration[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return facturesRestauration[i];
  },
  deleteFactureRestauration: (id: string) => {
    facturesRestauration = facturesRestauration.filter((f) => f.id !== id);
    return true;
  },

  getStagesProgramme: () =>
    [...stagesProgramme].sort((a, b) => a.date_debut.localeCompare(b.date_debut)),
  getStageProgramme: (id: string) => stagesProgramme.find((s) => s.id === id),
  createStageProgramme: (input: StageProgrammeInput) => {
    const ts = new Date().toISOString();
    const item: StageProgramme = { ...input, id: newId(), created_at: ts, updated_at: ts };
    stagesProgramme = [item, ...stagesProgramme];
    return item;
  },
  updateStageProgramme: (id: string, input: Partial<StageProgrammeInput>) => {
    const i = stagesProgramme.findIndex((s) => s.id === id);
    if (i === -1) return null;
    stagesProgramme[i] = {
      ...stagesProgramme[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return stagesProgramme[i];
  },
  deleteStageProgramme: (id: string) => {
    stagesProgramme = stagesProgramme.filter((s) => s.id !== id);
    return true;
  },

  getOccupationCne: () =>
    [...occupationCne].sort((a, b) => b.date.localeCompare(a.date)),
  createOccupationCne: (input: OccupationCneInput) => {
    const item: OccupationCneSnapshot = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    occupationCne = [item, ...occupationCne];
    return item;
  },

  getImportHistory: () =>
    [...importHistory].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  addImportHistory: (input: ImportHistoryInput) => {
    const item: ImportHistoryEntry = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    importHistory = [item, ...importHistory];
    return item;
  },

  getSystemLogs: (limit = 50) =>
    [...systemLogs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit),
  addSystemLog: (input: SystemLogInput) => {
    const item: SystemLogEntry = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    systemLogs = [item, ...systemLogs];
    return item;
  },

  getDemandesLogistique: () => [...demandesLogistique],
  getDemandeLogistique: (id: string) => demandesLogistique.find((d) => d.id === id),
  createDemandeLogistique: (input: DemandeLogistiqueInput) => {
    const ts = new Date().toISOString();
    const item: DemandeLogistique = { ...input, id: newId(), created_at: ts, updated_at: ts };
    demandesLogistique = [item, ...demandesLogistique];
    return item;
  },
  updateDemandeLogistique: (id: string, input: Partial<DemandeLogistiqueInput>) => {
    const i = demandesLogistique.findIndex((d) => d.id === id);
    if (i === -1) return null;
    demandesLogistique[i] = {
      ...demandesLogistique[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return demandesLogistique[i];
  },
  deleteDemandeLogistique: (id: string) => {
    demandesLogistique = demandesLogistique.filter((d) => d.id !== id);
    return true;
  },

  getBilletsAvion: () => [...billetsAvion],
  getBilletAvion: (id: string) => billetsAvion.find((b) => b.id === id),
  createBilletAvion: (input: DemandeBilletAvionInput) => {
    const ts = new Date().toISOString();
    const item: DemandeBilletAvion = { ...input, id: newId(), created_at: ts, updated_at: ts };
    billetsAvion = [item, ...billetsAvion];
    return item;
  },
  updateBilletAvion: (id: string, input: Partial<DemandeBilletAvionInput>) => {
    const i = billetsAvion.findIndex((b) => b.id === id);
    if (i === -1) return null;
    billetsAvion[i] = {
      ...billetsAvion[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return billetsAvion[i];
  },
  deleteBilletAvion: (id: string) => {
    billetsAvion = billetsAvion.filter((b) => b.id !== id);
    return true;
  },

  getDepensesByJoueur: (joueurId: string) =>
    joueurDepenses
      .filter((d) => d.joueur_id === joueurId)
      .sort((a, b) => b.date_depense.localeCompare(a.date_depense)),
  createJoueurDepense: (input: JoueurDepenseInput) => {
    const item: JoueurDepense = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    joueurDepenses = [item, ...joueurDepenses];
    return item;
  },
  getAllJoueurDepenses: () => [...joueurDepenses],

  getEntraineurs: () => [...entraineurs].sort((a, b) => a.nom.localeCompare(b.nom)),
  getEntraineur: (id: string) => entraineurs.find((e) => e.id === id),
  createEntraineur: (input: EntraineurInput) => {
    const item: Entraineur = { ...input, id: newId(), created_at: new Date().toISOString() };
    entraineurs = [item, ...entraineurs];
    return item;
  },
  updateEntraineur: (id: string, input: Partial<EntraineurInput>) => {
    const i = entraineurs.findIndex((e) => e.id === id);
    if (i === -1) return null;
    entraineurs[i] = { ...entraineurs[i], ...input };
    return entraineurs[i];
  },
  deleteEntraineur: (id: string) => {
    entraineurs = entraineurs.filter((e) => e.id !== id);
    missionsEntraineur = missionsEntraineur.filter((m) => m.entraineur_id !== id);
    entraineurDepenses = entraineurDepenses.filter((d) => d.entraineur_id !== id);
    return true;
  },

  getMissionsEntraineur: () =>
    [...missionsEntraineur].sort((a, b) => a.date_debut.localeCompare(b.date_debut)),
  createMissionEntraineur: (input: MissionEntraineurInput) => {
    const item: MissionEntraineur = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    missionsEntraineur = [item, ...missionsEntraineur];
    return item;
  },
  updateMissionEntraineur: (id: string, input: Partial<MissionEntraineurInput>) => {
    const i = missionsEntraineur.findIndex((m) => m.id === id);
    if (i === -1) return null;
    missionsEntraineur[i] = { ...missionsEntraineur[i], ...input };
    return missionsEntraineur[i];
  },

  getEntraineurDepenses: () =>
    [...entraineurDepenses].sort((a, b) => b.date_depense.localeCompare(a.date_depense)),
  createEntraineurDepense: (input: EntraineurDepenseInput) => {
    const item: EntraineurDepense = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    entraineurDepenses = [item, ...entraineurDepenses];
    return item;
  },

  getDisponibilitesEntraineur: () => [...disponibilitesEntraineur],
  setDisponibiliteEntraineur: (input: DisponibiliteEntraineurInput) => {
    const i = disponibilitesEntraineur.findIndex(
      (d) => d.entraineur_id === input.entraineur_id && d.date === input.date
    );
    if (i >= 0) {
      disponibilitesEntraineur[i] = { ...disponibilitesEntraineur[i], ...input, id: disponibilitesEntraineur[i]!.id };
      return disponibilitesEntraineur[i]!;
    }
    const item: DisponibiliteEntraineur = { ...input, id: newId() };
    disponibilitesEntraineur = [item, ...disponibilitesEntraineur];
    return item;
  },

  getBudgetAnnuel: (annee: number) => budgetAnnuel.filter((b) => b.annee === annee),
  updateBudgetAnnuel: (id: string, input: Partial<BudgetAnnuelLigneInput>) => {
    const i = budgetAnnuel.findIndex((b) => b.id === id);
    if (i === -1) return null;
    budgetAnnuel[i] = { ...budgetAnnuel[i], ...input, updated_at: new Date().toISOString() };
    return budgetAnnuel[i];
  },

  getHistorique: () => [...historique].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  addHistorique: (input: HistoriqueInput) => {
    const item: HistoriqueEntry = {
      ...input,
      id: newId(),
      created_at: new Date().toISOString(),
    };
    historique = [item, ...historique];
    return item;
  },

  getDossiersPasseport: () => [...dossiersPasseport],
  getDossierByJoueurId: (joueurId: string) =>
    dossiersPasseport.find((d) => d.joueur_id === joueurId) ?? null,
  createDossierPasseport: (input: DossierPasseportInput) => {
    const now = new Date().toISOString();
    const item: DossierPasseport = {
      ...input,
      id: newId(),
      created_at: now,
      updated_at: now,
    };
    dossiersPasseport = [item, ...dossiersPasseport];
    return item;
  },
  updateDossierPasseport: (id: string, input: Partial<DossierPasseportInput>) => {
    const i = dossiersPasseport.findIndex((d) => d.id === id);
    if (i === -1) return null;
    dossiersPasseport[i] = {
      ...dossiersPasseport[i],
      ...input,
      updated_at: new Date().toISOString(),
    };
    return dossiersPasseport[i];
  },
  addVisa: (dossierId: string, visa: VisaInput) => {
    const i = dossiersPasseport.findIndex((d) => d.id === dossierId);
    if (i === -1) return null;
    const entry = { ...visa, id: newId() };
    dossiersPasseport[i] = {
      ...dossiersPasseport[i],
      visas: [...dossiersPasseport[i].visas, entry],
      updated_at: new Date().toISOString(),
    };
    return dossiersPasseport[i];
  },
  removeVisa: (dossierId: string, visaId: string) => {
    const i = dossiersPasseport.findIndex((d) => d.id === dossierId);
    if (i === -1) return null;
    dossiersPasseport[i] = {
      ...dossiersPasseport[i],
      visas: dossiersPasseport[i].visas.filter((v) => v.id !== visaId),
      updated_at: new Date().toISOString(),
    };
    return dossiersPasseport[i];
  },

  getPerformanceRankings: () => [...performanceRankings],
  getPerformanceMatchs: () => [...performanceMatchs],
  getPerformanceProchains: () => [...performanceProchains],
  getPerformanceTournois: () => [...performanceTournois],
  getPerformancePalmares: () => [...performancePalmares],
  getPerformanceEvolution: (joueurId: string) =>
    clone(
      performanceEvolutionRuntime?.[joueurId] ??
        seedPerformanceEvolution[joueurId] ??
        []
    ),
  getPerformanceSurfaces: (joueurId: string) =>
    clone(
      performanceSurfacesRuntime?.[joueurId] ??
        seedPerformanceSurfaces[joueurId] ??
        []
    ),
  getPerformanceSyncMeta: () => performanceSyncMeta,
  setPerformanceSync: (data: {
    provider: string;
    synced_at: string;
    matchs: MatchPerformance[];
    rankings: RankingSnapshot[];
  }) => {
    performanceSyncMeta = {
      provider: data.provider,
      synced_at: data.synced_at,
    };
    performanceMatchs = data.matchs;
    performanceRankings = data.rankings;
  },

  /** Sync complète API Tennis (joueurs réels MAR + matchs + classements) */
  setPerformanceSyncFull: (data: PerformanceSyncPayload) => {
    performanceSyncMeta = {
      provider: data.provider,
      synced_at: data.synced_at,
    };
    performanceMatchs = data.matchs;
    performanceRankings = data.rankings;
    performanceProchains = data.prochains;
    performanceTournois = data.tournois;
    performancePalmares = data.palmares;
    performanceEvolutionRuntime = clone(data.evolution);
    performanceSurfacesRuntime = clone(data.surfaces);

    const byId = new Map(joueurs.map((j) => [j.id, j]));
    for (const incoming of data.joueurs) {
      const existing = byId.get(incoming.id);
      byId.set(incoming.id, existing ? { ...existing, ...incoming } : incoming);
    }
    joueurs = Array.from(byId.values());
    mockStore.ensureFrmtClassementJoueurs();
  },
};

export function getMockSeed() {
  return {
    groupes: clone(seedGroupes),
    joueurs: clone([...seedFrmtClassementJoueurs, ...seedJoueursMarocains, ...seedJoueurs]),
    performanceRankings: clone(seedPerformanceRankings),
    performanceMatchs: clone(seedPerformanceMatchs),
    performanceProchains: clone(seedPerformanceProchains),
    performanceTournois: clone(seedPerformanceTournois),
    performancePalmares: clone(seedPerformancePalmares),
    courts: clone(seedCourts),
    reservations: clone(seedReservations),
    hebergements: clone(seedHebergements),
    repas: clone(seedRepas),
    prestatairesRestauration: clone(prestatairesRestauration),
    besoinsRestauration: clone(besoinsRestauration),
    facturesRestauration: clone(facturesRestauration),
    stagesProgramme: clone(stagesProgramme),
    occupationCne: clone(occupationCne),
    importHistory: clone(importHistory),
    systemLogs: clone(systemLogs),
    entraineurs: clone(entraineurs),
    missionsEntraineur: clone(missionsEntraineur),
    entraineurDepenses: clone(entraineurDepenses),
    disponibilitesEntraineur: clone(disponibilitesEntraineur),
    budgetAnnuel: clone(budgetAnnuel),
    demandesLogistique: clone(seedDemandesLogistique),
    billetsAvion: clone(seedBilletsAvion),
    joueurDepenses: clone(joueurDepenses),
    historique: clone(seedHistorique),
    dossiersPasseport: clone(seedDossiersPasseport),
  };
}
