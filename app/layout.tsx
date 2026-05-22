import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, FEDERATION_NAME } from "@/lib/constants/branding";
import { Suspense } from "react";
import { SupabaseSessionCleanup } from "@/components/auth/SupabaseSessionCleanup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
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
