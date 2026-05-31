"use client";

import { useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const hasResolved = useRef(false);

  if (!loading) {
    hasResolved.current = true;
  }

  if (loading && !hasResolved.current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-frmt-green border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
