import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, FEDERATION_NAME } from "@/lib/constants/branding";
import { Suspense } from "react";
import { SupabaseSessionCleanup } from "@/components/auth/SupabaseSessionCleanup";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Gestion du ${APP_NAME} — ${FEDERATION_NAME}`,
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased dark"
    >
      <body className="min-h-full bg-background text-foreground">
        <Suspense fallback={null}>
          <SupabaseSessionCleanup />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
