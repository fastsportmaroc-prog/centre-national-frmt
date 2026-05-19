import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

const modules = [
  { href: "/stages", label: "Stages & Actions", desc: "Planification, participants, coûts, statut" },
  { href: "/occupation", label: "Occupation", desc: "Taux d'occupation et disponibilité" },
  { href: "/infrastructures", label: "Infrastructures & terrains", desc: "Courts, fitness, natation, réservations" },
  { href: "/hebergement", label: "Hébergement", desc: "Chambres et nuitées" },
  { href: "/restauration", label: "Restauration", desc: "Repas, allergies, coûts" },
  { href: "/materiel", label: "Matériel", desc: "Stock, mouvements et alertes" },
  { href: "/entraineurs", label: "Entraîneurs", desc: "Missions et affectations" },
  { href: "/planning", label: "Planning", desc: "Vue jour / semaine / mois" },
  { href: "/rapports", label: "Rapports", desc: "Exports PDF / Excel" },
];

export default function CentreNationalPage() {
  return (
    <>
      <PageHeader
        title="Centre National"
        description="Vue centralisée des opérations CNE FRMT"
      />
      <main className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="premium h-full p-4 transition hover:border-frmt-green/40">
              <p className="font-semibold">{m.label}</p>
              <p className="mt-1 text-sm text-muted">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </main>
    </>
  );
}
