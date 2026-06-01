"use client";

import { Suspense } from "react";
import { LoginCourtSvg } from "@/components/auth/LoginCourtsBackground";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginStatus } from "@/components/auth/LoginStatus";
import { SessionExpiredNotice } from "@/components/auth/SessionExpiredNotice";
import { LogoPlaceholder } from "@/components/brand/LogoPlaceholder";
import { FEDERATION_NAME, FEDERATION_NAME_AR } from "@/lib/constants/branding";
import { isProductionRuntime } from "@/lib/env/runtime";

type Props = {
  configured: boolean;
  projectRef?: string;
};

export function LoginScreen({ configured, projectRef }: Props) {
  const isProd = isProductionRuntime();

  return (
    <div className="login-screen relative min-h-screen overflow-hidden">
      {/* Fond : terre battue | surface dure */}
      <div className="login-courts-split" aria-hidden>
        <div className="login-court-half login-court-half--clay">
          <LoginCourtSvg variant="clay" className="login-court-fill" />
        </div>
        <div className="login-court-half login-court-half--hard">
          <LoginCourtSvg variant="hard" className="login-court-fill" />
        </div>
      </div>

      {/* Voile léger — laisse voir les courts */}
      <div className="login-scrim pointer-events-none absolute inset-0" aria-hidden />

      {/* Contenu centré */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="login-shell w-full max-w-[440px]">
          {/* En-tête marque */}
          <header className="mb-8 text-center">
            <div className="login-logo-badge mx-auto mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-2xl">
              <LogoPlaceholder size="lg" className="drop-shadow-lg" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-frmt-gold">
              Centre National
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              FRMT
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/75" dir="rtl">
              {FEDERATION_NAME_AR}
            </p>
          </header>

          {/* Carte connexion */}
          <div className="login-card-pro overflow-hidden rounded-2xl">
            <div className="login-card-pro-accent" aria-hidden />
            <LoginStatus />
            <Suspense fallback={null}>
              <SessionExpiredNotice />
            </Suspense>
            <Suspense
              fallback={
                <div className="flex items-center justify-center p-12 text-sm text-muted">
                  Chargement…
                </div>
              }
            >
              <LoginForm projectRef={projectRef} configured={configured} />
            </Suspense>
          </div>

          {!isProd && (
            <details className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60 backdrop-blur-sm">
              <summary className="cursor-pointer font-medium text-white/90">Aide développeur</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>.env.local · clé anon eyJ…</li>
                <li>npm run repair:compte</li>
              </ul>
            </details>
          )}

          <footer className="mt-8 text-center">
            <p className="text-xs leading-relaxed text-white/55">{FEDERATION_NAME}</p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
              Accès réservé · {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </div>

      <div className="login-tricolor pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-1" aria-hidden />
    </div>
  );
}
