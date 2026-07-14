"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-frmt-green border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
