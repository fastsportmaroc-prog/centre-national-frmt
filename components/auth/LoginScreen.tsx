"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginStatus } from "@/components/auth/LoginStatus";
import { SessionExpiredNotice } from "@/components/auth/SessionExpiredNotice";
import { LogoPlaceholder } from "@/components/brand/LogoPlaceholder";
import {
  APP_NAME_SHORT,
  FEDERATION_NAME,
  FEDERATION_NAME_AR,
} from "@/lib/constants/branding";
import { isProductionRuntime } from "@/lib/env/runtime";

type Props = {
  configured: boolean;
  projectRef?: string;
};

function LoginHeroBackdrop() {
  return (
    <div className="login-hero-bg pointer-events-none absolute inset-0" aria-hidden>
      <div className="login-hero-mesh" />
      <div className="login-hero-glow login-hero-glow--gold" />
      <div className="login-hero-glow login-hero-glow--red" />
    </div>
  );
}

export function LoginScreen({ configured, projectRef }: Props) {
  const isProd = isProductionRuntime();

  return (
    <div className="login-v3 relative min-h-screen">
      <div className="login-v3-tricolor" aria-hidden />

      <div className="login-v3-grid relative z-10 min-h-screen lg:grid lg:grid-cols-2">
        {/* Hero — identité fédération */}
        <section className="login-v3-hero relative flex flex-col justify-between overflow-hidden px-8 py-10 sm:px-12 lg:px-14 xl:px-20 lg:py-14">
          <LoginHeroBackdrop />

          <div className="login-v3-hero-content relative z-[1]">
            <div className="login-v3-logo-wrap mb-8 lg:mb-12">
              <LogoPlaceholder size="xl" className="login-v3-logo" />
            </div>

            <p className="login-v3-badge">{APP_NAME_SHORT}</p>

            <h1 className="login-v3-federation">
              <span>Fédération Royale</span>
              <span>Marocaine de Tennis</span>
            </h1>

            <div className="login-v3-divider" aria-hidden />

            <p className="login-v3-ar" dir="rtl">
              {FEDERATION_NAME_AR}
            </p>
          </div>

          <p className="login-v3-hero-foot relative z-[1] hidden text-sm lg:block">
            Plateforme de gestion — stages, compétitions &amp; opérations
          </p>
        </section>

        {/* Connexion — carte claire */}
        <section className="login-v3-panel flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="login-v3-panel-inner w-full max-w-[440px]">
            <header className="login-v3-mobile-brand mb-8 text-center lg:hidden">
              <div className="login-v3-logo-wrap login-v3-logo-wrap--sm mx-auto mb-5 inline-flex">
                <LogoPlaceholder size="lg" />
              </div>
              <p className="login-v3-federation-sm">{FEDERATION_NAME}</p>
            </header>

            <div className="login-v3-card">
              <header className="login-v3-card-head">
                <h2 className="login-v3-card-title">Connexion</h2>
                <p className="login-v3-card-sub">Accès réservé au personnel autorisé</p>
              </header>

              <LoginStatus />
              <Suspense fallback={null}>
                <SessionExpiredNotice />
              </Suspense>
              <Suspense
                fallback={
                  <div className="py-14 text-center text-sm text-neutral-400">Chargement…</div>
                }
              >
                <LoginForm projectRef={projectRef} configured={configured} />
              </Suspense>
            </div>

            {!isProd && (
              <details className="login-v3-dev mt-4 text-xs text-neutral-400">
                <summary className="cursor-pointer text-neutral-500">Aide développeur</summary>
                <ul className="mt-2 list-disc pl-4">
                  <li>.env.local · clé anon</li>
                  <li>npm run repair:compte</li>
                </ul>
              </details>
            )}

            <footer className="login-v3-footer mt-8 text-center">
              <p>{FEDERATION_NAME}</p>
              <p className="login-v3-footer-year">{new Date().getFullYear()}</p>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
