import { filterNavByRole } from "@/lib/auth/permissions";
import type { RoleUtilisateur } from "@/lib/types/roles";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  MapPin,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  BedDouble,
  UtensilsCrossed,
  Settings,
  FileText,
  History,
  Trophy,
  UserCog,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSectionId = "general" | "systeme";

export type NavSection = {
  id: NavSectionId;
  label: string;
  description?: string;
  items: NavItem[];
};

/** Admin reste accessible via /admin ou Paramètres — hors sidebar principale. */
export const adminNavHref = "/admin";

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/stages", label: "Stages", icon: Trophy },
  { href: "/joueurs", label: "Joueurs", icon: Users },
  { href: "/entraineurs", label: "Entraîneurs", icon: UserCog },
  { href: "/groupes", label: "Groupes", icon: UsersRound },
  { href: "/infrastructures", label: "Infrastructures & terrains", icon: MapPin },
  { href: "/reservations", label: "Réservations", icon: CalendarCheck },
  { href: "/calendrier", label: "Calendrier", icon: CalendarRange },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/hebergement", label: "Hébergement", icon: BedDouble },
  { href: "/restauration", label: "Restauration", icon: UtensilsCrossed },
  { href: "/materiel", label: "Matériel", icon: Wrench },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/rapports", label: "Rapports", icon: FileText },
];

export const navSections: NavSection[] = [
  {
    id: "general",
    label: "Navigation",
    items: MAIN_NAV,
  },
  {
    id: "systeme",
    label: "Système",
    items: [
      { href: "/historique", label: "Historique", icon: History },
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

/** Liste plate (compatibilité permissions / exports) */
export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

export function getNavSectionsForUser(
  _isAdmin: boolean,
  frmtRole: RoleUtilisateur = "admin"
): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: filterNavByRole(section.items, frmtRole),
    }))
    .filter((section) => section.items.length > 0);
}
