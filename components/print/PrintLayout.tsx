"use client";

import { LOGO_FRMT_PNG_DATA_URI } from "@/lib/brand/logo-frmt-base64";
import { FEDERATION_NAME, PRINT_FOOTER_LEFT } from "@/lib/constants/branding";
import { formatGeneratedDatePrint } from "@/lib/print/format-date";
import { getPrintReportCss } from "@/lib/print/print-report-css";
import type { ReactNode } from "react";

export type PrintLayoutUser = {
  nom?: string;
  role?: string;
};

type PrintLayoutProps = {
  title: string;
  subtitle?: string;
  user?: PrintLayoutUser | null;
  reference?: string;
  children: ReactNode;
};

export function PrintLayout({ title, subtitle, user, reference, children }: PrintLayoutProps) {
  const year = new Date().getFullYear();
  const ref = reference ?? `CNF-${year}`;
  return (
    <div className="print-doc">
      <style dangerouslySetInnerHTML={{ __html: getPrintReportCss() }} />
      <header className="ph print-header">
        <img
          src={LOGO_FRMT_PNG_DATA_URI}
          alt="Logo fédération"
          width={80}
          style={{ width: 80, height: "auto", objectFit: "contain" }}
        />
        <div className="ph-org">
          <p className="ph-org-name">{FEDERATION_NAME}</p>
        </div>
        <div className="ph-meta ph-meta-gen">
          <div>Réf. : {ref}</div>
          <div>Généré le {formatGeneratedDatePrint()}</div>
          {user?.nom ? <div>{user.nom}</div> : null}
          {user?.role ? (
            <div>
              <strong>{user.role}</strong>
            </div>
          ) : null}
        </div>
      </header>

      <div className="gold-line" />

      <div className="report-title-block">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {children}

      <footer className="print-footer">
        <span className="fl">{PRINT_FOOTER_LEFT}</span>
        <span className="fc">Document officiel — Usage interne</span>
        <span>
          Page <span className="pnum" />
        </span>
      </footer>
    </div>
  );
}
