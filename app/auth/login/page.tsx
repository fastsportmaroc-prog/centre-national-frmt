import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginStatus } from "@/components/auth/LoginStatus";
import { SessionExpiredNotice } from "@/components/auth/SessionExpiredNotice";
import { AppBrand } from "@/components/brand/AppBrand";
import { Card } from "@/components/ui/Card";
import { FEDERATION_NAME } from "@/lib/constants/branding";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  let projectRef = "kcwvqwvcyiiwalyvhvxz";
  if (configured) {
    try {
      projectRef = new URL(getSupabasePublicEnv().url).hostname.split(".")[0] ?? projectRef;
    } catch {
      /* keep default */
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="frmt-tricolor fixed top-0 left-0 right-0" />
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <AppBrand size="xl" centered />
          <p className="mt-4 text-sm text-muted">Connexion — {FEDERATION_NAME}</p>
        </div>
        <Card className="card-premium border-frmt-green/25">
          <div className="px-4 pt-4">
            <LoginStatus />
          </div>
          <Suspense fallback={null}>
            <SessionExpiredNotice />
          </Suspense>
          <Suspense fallback={<p className="p-4 text-center text-sm">Chargement...</p>}>
            <LoginForm projectRef={projectRef} configured={configured} />
          </Suspense>
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            <p className="font-medium text-foreground">Probleme de connexion ?</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>
                .env.local : cle <strong>eyJ</strong> (anon), pas seulement sb_publishable
              </li>
              <li>Double-clic <strong>REPARER-COMPTE.bat</strong> (avec service_role)</li>
              <li>SQL : migration 020 dans Supabase</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
