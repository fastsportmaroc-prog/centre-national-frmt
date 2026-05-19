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
  Percent,
  BedDouble,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Shield,
  Truck,
  Plane,
  FileText,
  History,
  BookOpen,
  Globe,
  Trophy,
  UserCog,
  Wallet,
  FileSpreadsheet,
  Building2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSectionId = "general" | "centre_national" | "logistique_frmt" | "systeme";

export type NavSection = {
  id: NavSectionId;
  label: string;
  description?: string;
  items: NavItem[];
};

export const adminNavHref = "/admin";

export const navSections: NavSection[] = [
  {
    id: "general",
    label: "Accueil",
    items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    id: "centre_national",
    label: "Centre National",
    description: "Joueurs, encadrement, terrains, vie du centre",
    items: [
      { href: "/centre-national", label: "Centre National", icon: Building2 },
      { href: "/joueurs", label: "Joueurs", icon: Users },
      { href: "/entraineurs", label: "Entraîneurs", icon: UserCog },
      { href: "/entraineurs/planning", label: "Planning entraîneurs", icon: CalendarDays },
      { href: "/groupes", label: "Groupes", icon: UsersRound },
      { href: "/infrastructures", label: "Infrastructures & terrains", icon: MapPin },
      { href: "/reservations", label: "Réservations", icon: CalendarCheck },
      { href: "/calendrier", label: "Calendrier", icon: CalendarRange },
      { href: "/planning", label: "Planning", icon: CalendarDays },
      { href: "/hebergement", label: "Hébergement", icon: BedDouble },
      { href: "/restauration", label: "Restauration", icon: UtensilsCrossed },
      { href: "/materiel", label: "Matériel", icon: Wrench },
      { href: "/stages", label: "Stages CNE", icon: Trophy },
      { href: "/occupation", label: "Occupation CNE", icon: Percent },
      { href: "/import-cne", label: "Import Excel CNE", icon: FileSpreadsheet },
      { href: "/rapports", label: "Rapports", icon: FileText },
      { href: "/statistiques", label: "Analyses", icon: BarChart3 },
      {
        href: "/performances/marocains",
        label: "Résultats internationaux",
        icon: Globe,
      },
    ],
  },
  {
    id: "logistique_frmt",
    label: "Logistique FRMT",
    description: "Voyages, visas, transport, budget missions",
    items: [
      { href: "/logistique", label: "Demandes logistique", icon: Truck },
      { href: "/billets-avion", label: "Billets d'avion", icon: Plane },
      { href: "/passeport", label: "Passeport & visas", icon: BookOpen },
      { href: "/budget", label: "Budget & voyages", icon: Wallet },
      { href: "/budget/deplacements", label: "Budget déplacement", icon: Wallet },
    ],
  },
  {
    id: "systeme",
    label: "Système",
    items: [
      { href: "/historique", label: "Historique", icon: History },
      { href: "/admin", label: "Administration", icon: Shield },
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

/** Liste plate (compatibilité permissions / exports) */
export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

export function getNavSectionsForUser(
  isAdmin: boolean,
  frmtRole: RoleUtilisateur = "admin"
): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: filterNavByRole(
        section.items.filter((item) => item.href !== adminNavHref || isAdmin),
        frmtRole
      ),
    }))
    .filter((section) => section.items.length > 0);
}
