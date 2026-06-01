import { LoginScreen } from "@/components/auth/LoginScreen";
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

  return <LoginScreen configured={configured} projectRef={projectRef} />;
}
