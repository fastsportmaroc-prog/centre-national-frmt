"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getHebergements } from "@/lib/data/hebergements";
import { getJoueurs } from "@/lib/data/joueurs";
import { getCourts } from "@/lib/data/courts";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DashboardStats } from "@/lib/types/database";
import {
  Activity,
  Database,
  Shield,
  Users,
  MapPin,
  CalendarCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFrmtRole } from "@/components/auth/FrmtRoleProvider";
import { getSystemLogs } from "@/lib/data/system-logs";
import { versionLabel } from "@/lib/version";

export function AdminDashboardClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { frmtRole } = useFrmtRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<{ message: string; level: string }[]>([]);
  const [counts, setCounts] = useState({
    reservations: 0,
    hebergements: 0,
    courtsInactifs: 0,
  });

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getReservationsWithRelations(),
      getHebergements(),
      getCourts(),
      getJoueurs(),
    ]).then(([s, res, h, c]) => {
      setStats(s);
      setCounts({
        reservations: res.length,
        hebergements: h.filter((x) => x.occupe).length,
        courtsInactifs: c.filter((x) => !x.actif).length,
      });
    });
  }, []);

  if (authLoading) {
    return <p className="p-6 text-muted">Chargement…</p>;
  }

  if (!user || user.role !== "admin") {
    return (
      <p className="p-6 text-red-400">
        Accès réservé aux administrateurs.
      </p>
    );
  }

  return (
    <>
      <PageHeader
        title="Administration"
        description="Tableau de bord réservé aux administrateurs"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Admin</Badge>
          <Badge variant="muted">{user.email}</Badge>
          <Badge variant="success">Supabase connecté</Badge>
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Joueurs" value={stats.totalJoueurs} icon={Users} />
            <StatCard label="Courts actifs" value={stats.courtsActifs} icon={MapPin} />
            <StatCard
              label="Réservations"
              value={counts.reservations}
              icon={CalendarCheck}
            />
            <StatCard
              label="Occupation"
              value={`${stats.tauxOccupation}%`}
              icon={Activity}
            />
          </div>
        )}

        <Card premium className="p-4">
          <p className="text-sm text-muted">
            Rôle FRMT actif : <strong className="text-frmt-green">{frmtRole}</strong>
          </p>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card premium>
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-tennis" />
              <h2 className="font-semibold">Infrastructure</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>Version : {versionLabel()}</li>
              <li>Snapshot : npm run backup:snapshot</li>
              <li>
                Supabase :{" "}
                <span className="text-foreground">
                  {isSupabaseConfigured() ? "Connecté" : "Non configuré (mock)"}
                </span>
              </li>
              <li>Chambres occupées : {counts.hebergements}</li>
              <li>Courts inactifs : {counts.courtsInactifs}</li>
            </ul>
          </Card>
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-tennis" />
              <h2 className="font-semibold">Sécurité</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>RLS activée sur toutes les tables</li>
              <li>Auth email / mot de passe</li>
              <li>Storage bucket : joueurs-photos</li>
              <li>Anti-chevauchement réservations (contrainte SQL)</li>
              {logs.length > 0 && (
                <li className="pt-2 border-t border-border">
                  <span className="text-foreground font-medium">Logs système</span>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {logs.map((l, i) => (
                      <li key={i}>
                        [{l.level}] {l.message}
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}
