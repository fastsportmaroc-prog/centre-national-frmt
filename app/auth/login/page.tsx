import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginStatus } from "@/components/auth/LoginStatus";
import { SessionExpiredNotice } from "@/components/auth/SessionExpiredNotice";
import { AppBrand } from "@/components/brand/AppBrand";
import { Card } from "@/components/ui/Card";
import { FEDERATION_NAME } from "@/lib/constants/branding";
import { isProductionRuntime } from "@/lib/env/runtime";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  const isProd = isProductionRuntime();
  let projectRef: string | undefined;
  if (!isProd && configured) {
    try {
      projectRef = new URL(getSupabasePublicEnv().url).hostname.split(".")[0];
    } catch {
      projectRef = undefined;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a1628] via-background to-background px-4 py-10">
      <div className="frmt-tricolor fixed top-0 left-0 right-0 z-10" />

      <div className="relative z-0 w-full max-w-md space-y-6">
        <header className="space-y-3 text-center">
          <AppBrand size="xl" centered />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Centre National FRMT
            </h1>
            <p className="mt-1 text-sm text-muted">{FEDERATION_NAME}</p>
          </div>
        </header>

        <Card className="card-premium overflow-hidden border-frmt-green/20 shadow-xl shadow-black/20">
          <LoginStatus />
          <Suspense fallback={null}>
            <SessionExpiredNotice />
          </Suspense>
          <Suspense fallback={<p className="p-6 text-center text-sm text-muted">Chargement…</p>}>
            <LoginForm projectRef={projectRef} configured={configured} />
          </Suspense>

          {!isProd && (
            <div className="border-t border-border bg-surface-elevated/30 px-6 py-4 text-xs text-muted">
              <p className="font-medium text-foreground">Problème de connexion ? (dev)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>
                  Vérifiez <strong>.env.local</strong> : clé anon <strong>eyJ…</strong>, pas seulement
                  sb_publishable
                </li>
                <li>
                  Script local : <strong>npm run repair:compte</strong> (avec SUPABASE_SERVICE_ROLE_KEY)
                </li>
                <li>Migrations SQL dans le dossier supabase/migrations</li>
              </ol>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted">
          Accès réservé au personnel autorisé du Centre National.
        </p>
      </div>
    </div>
  );
}
