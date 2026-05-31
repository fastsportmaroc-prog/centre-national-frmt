import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCog,
  UsersRound,
  MapPin,
  CalendarCheck,
  CalendarRange,
  CalendarDays,
  BedDouble,
  UtensilsCrossed,
  HeartPulse,
  Wrench,
  Wallet,
  FileText,
  History,
  Settings,
  Plane,
  ClipboardCheck,
  BarChart3,
  Bus,
  ShieldCheck,
  BookText,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export type V2NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: keyof typeof NAV_BADGE_KEYS;
};

export type V2NavSection = {
  id: string;
  label?: string;
  items: V2NavItem[];
  separatorBefore?: boolean;
};

const V2_PREFIX = "/v2";

export const NAV_BADGE_KEYS = {
  hebergement: "/v2/hebergement",
  billets: "/v2/billets-avion",
  rapports: "/v2/rapports",
} as const;

export const v2NavSections: V2NavSection[] = [
  {
    id: "dashboard",
    items: [
      { href: `${V2_PREFIX}/dashboard`, label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    id: "programme",
    label: "Programme CNE",
    separatorBefore: true,
    items: [
      { href: `${V2_PREFIX}/stages`, label: "Stages", icon: Trophy },
      { href: `${V2_PREFIX}/calendrier`, label: "Calendrier", icon: CalendarRange },
      { href: `${V2_PREFIX}/planning`, label: "Planning", icon: CalendarDays },
    ],
  },
  {
    id: "participants",
    label: "Participants CNE",
    separatorBefore: true,
    items: [
      { href: `${V2_PREFIX}/joueurs`, label: "Joueurs", icon: Users },
      { href: `${V2_PREFIX}/entraineurs`, label: "Entraîneurs", icon: UserCog },
      { href: `${V2_PREFIX}/groupes`, label: "Groupes", icon: UsersRound },
    ],
  },
  {
    id: "logistique",
    label: "Logistique CNE",
    separatorBefore: true,
    items: [
      { href: `${V2_PREFIX}/hebergement`, label: "Hébergement", icon: BedDouble, badgeKey: "hebergement" },
      { href: `${V2_PREFIX}/restauration`, label: "Restauration", icon: UtensilsCrossed },
      { href: `${V2_PREFIX}/kinesitherapie`, label: "Kinésithérapie", icon: HeartPulse },
      { href: `${V2_PREFIX}/infrastructures`, label: "Infrastructures & terrains", icon: MapPin },
      { href: `${V2_PREFIX}/reservations`, label: "Réservations", icon: CalendarCheck },
      { href: `${V2_PREFIX}/materiel`, label: "Matériel", icon: Wrench },
    ],
  },
  {
    id: "administratif",
    label: "Administratif",
    separatorBefore: true,
    items: [
      { href: `${V2_PREFIX}/budget`, label: "Budget administratif", icon: Wallet },
      { href: `${V2_PREFIX}/rapports`, label: "Rapports", icon: FileText, badgeKey: "rapports" },
      { href: `${V2_PREFIX}/statistiques`, label: "Statistiques", icon: BarChart3 },
      { href: `${V2_PREFIX}/historique`, label: "Historique", icon: History },
    ],
  },
  {
    id: "administration",
    label: "Gestion Compétition",
    separatorBefore: true,
    items: [
      { href: "/competitions", label: "Compétitions", icon: Trophy },
      { href: `${V2_PREFIX}/logistique`, label: "Logistique", icon: Bus },
      { href: `${V2_PREFIX}/passeports`, label: "Passeports & Visas", icon: ShieldCheck },
      { href: `${V2_PREFIX}/billets-avion`, label: "Billets avion", icon: Plane, badgeKey: "billets" },
      { href: `${V2_PREFIX}/lettres`, label: "Lettres officielles", icon: BookText },
      { href: `${V2_PREFIX}/administratif/documents`, label: "Documents", icon: ClipboardCheck },
      { href: `${V2_PREFIX}/budget/facturation-club`, label: "Facturation club", icon: Landmark },
    ],
  },
  {
    id: "settings",
    separatorBefore: true,
    items: [{ href: `${V2_PREFIX}/parametres`, label: "Paramètres", icon: Settings }],
  },
];

/** @deprecated flat list for mobile compat */
export const v2MainNav = v2NavSections.flatMap((s) => s.items);
export const v2AdminNav = v2NavSections.find((s) => s.id === "administration")?.items ?? [];
