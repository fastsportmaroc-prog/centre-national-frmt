"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured() || loading) return;
    if (!user) {
      router.replace("/auth/login?redirect=" + encodeURIComponent(window.location.pathname));
    }
  }, [user, loading, router]);

  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-frmt-green border-t-transparent" />
          <p className="mt-4 text-sm text-muted">Chargement de votre session…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
