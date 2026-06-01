"use client";

import { Suspense } from "react";
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

/** Fond atmosphérique — terre battue & dur, sans schéma technique */
function LoginAtmosphere() {
  return (
    <div className="login-atmosphere pointer-events-none absolute inset-0" aria-hidden>
      <div className="login-wash login-wash--clay" />
      <div className="login-wash login-wash--hard" />
      <div className="login-wash login-wash--green" />
      <div className="login-art-lines" />
      <div className="login-grain" />
      <div className="login-vignette" />
    </div>
  );
}

export function LoginScreen({ configured, projectRef }: Props) {
  const isProd = isProductionRuntime();

  return (
    <div className="login-screen relative min-h-screen">
      <LoginAtmosphere />

      <div className="login-layout relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
        {/* Panneau artistique — identité */}
        <aside className="login-brand-panel hidden flex-col justify-between px-12 py-14 xl:px-20 xl:py-16 lg:flex">
          <div className="login-brand-top">
            <span className="login-brand-tag">Portail officiel</span>
          </div>

          <div className="login-brand-center">
            <div className="login-logo-halo mx-auto mb-12 flex w-fit items-center justify-center p-8">
              <LogoPlaceholder size="xl" className="relative z-[1]" />
            </div>
            <p className="login-brand-eyebrow">Centre National</p>
            <h1 className="login-brand-title">FRMT</h1>
            <div className="login-brand-rule mx-auto" />
            <p className="login-brand-ar" dir="rtl">
              {FEDERATION_NAME_AR}
            </p>
          </div>

          <p className="login-brand-foot max-w-xs text-sm leading-relaxed text-white/40">
            Gestion intégrée des stages, compétitions et opérations du Centre National.
          </p>
        </aside>

        {/* Panneau connexion */}
        <main className="login-form-panel flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-16">
          {/* Mobile brand */}
          <header className="mb-10 text-center lg:hidden">
            <div className="login-logo-halo mx-auto mb-6 inline-flex p-5">
              <LogoPlaceholder size="lg" />
            </div>
            <p className="login-brand-eyebrow text-sm">Centre National</p>
            <h1 className="login-brand-title text-4xl">FRMT</h1>
          </header>

          <div className="mx-auto w-full max-w-[400px]">
            <header className="mb-8 lg:mb-10">
              <h2 className="login-form-title">Connexion</h2>
              <p className="login-form-sub">Espace réservé au personnel autorisé</p>
            </header>

            <div className="login-card-art">
              <LoginStatus />
              <Suspense fallback={null}>
                <SessionExpiredNotice />
              </Suspense>
              <Suspense
                fallback={
                  <div className="py-16 text-center text-sm text-white/40">Chargement…</div>
                }
              >
                <LoginForm projectRef={projectRef} configured={configured} />
              </Suspense>
            </div>

            {!isProd && (
              <details className="login-dev-hint mt-5">
                <summary>Aide développeur</summary>
                <ul className="mt-2 list-disc pl-4">
                  <li>.env.local · clé anon</li>
                  <li>npm run repair:compte</li>
                </ul>
              </details>
            )}

            <footer className="login-footer mt-10">
              <p>{FEDERATION_NAME}</p>
              <p className="login-footer-meta">Accès sécurisé · {new Date().getFullYear()}</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
