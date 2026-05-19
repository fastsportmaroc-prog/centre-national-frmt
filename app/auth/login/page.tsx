import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppBrand } from "@/components/brand/AppBrand";
import { Card } from "@/components/ui/Card";
import { FEDERATION_NAME } from "@/lib/constants/branding";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="frmt-tricolor fixed top-0 left-0 right-0" />
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <AppBrand size="xl" centered />
          <p className="mt-6 text-sm text-muted">Connexion sécurisée — espace fédération</p>
          <p className="mt-1 text-xs text-muted/80">{FEDERATION_NAME}</p>
        </div>
        <Card className="card-premium border-frmt-green/25 shadow-xl">
          <Suspense fallback={<p className="p-4 text-center text-sm text-muted">Chargement…</p>}>
            <LoginForm supabaseConfigured={isSupabaseConfigured()} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
