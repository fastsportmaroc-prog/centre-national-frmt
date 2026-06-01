"use client";

import { useId } from "react";

type CourtProps = {
  variant: "clay" | "hard";
  className?: string;
};

/** Court tennis — fond plein écran, couleurs marquées */
export function LoginCourtSvg({ variant, className = "" }: CourtProps) {
  const uid = useId().replace(/:/g, "");
  const isClay = variant === "clay";
  const base = isClay ? "#9B4E2A" : "#1A6B94";
  const mid = isClay ? "#B8652E" : "#2389B5";
  const noiseId = `court-${variant}-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 800 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={base} />
          <stop offset="50%" stopColor={mid} />
          <stop offset="100%" stopColor={base} />
        </linearGradient>
        <pattern id={noiseId} width="12" height="12" patternUnits="userSpaceOnUse">
          {isClay ? (
            <>
              <rect width="12" height="12" fill="#8B4513" opacity="0.15" />
              <circle cx="3" cy="4" r="1.2" fill="#6B3410" opacity="0.35" />
              <circle cx="9" cy="8" r="0.9" fill="#C4784A" opacity="0.25" />
            </>
          ) : (
            <>
              <rect width="12" height="12" fill="#155A78" opacity="0.12" />
              <circle cx="4" cy="3" r="0.8" fill="#0F4058" opacity="0.3" />
              <circle cx="8" cy="9" r="1" fill="#2E9CC8" opacity="0.2" />
            </>
          )}
        </pattern>
      </defs>
      <rect width="800" height="440" fill={`url(#bg-${uid})`} />
      <rect width="800" height="440" fill={`url(#${noiseId})`} />
      {/* Lignes court — bien visibles */}
      <rect x="40" y="30" width="720" height="380" stroke="rgba(255,255,255,0.92)" strokeWidth="4" />
      <rect x="110" y="30" width="580" height="380" stroke="rgba(255,255,255,0.75)" strokeWidth="3" />
      <line x1="400" y1="30" x2="400" y2="410" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
      <line x1="110" y1="220" x2="690" y2="220" stroke="rgba(255,255,255,0.88)" strokeWidth="4" />
      <line x1="110" y1="130" x2="690" y2="130" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />
      <line x1="110" y1="310" x2="690" y2="310" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />
      <line x1="400" y1="130" x2="400" y2="310" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
      {/* Zone de service */}
      <line x1="255" y1="130" x2="255" y2="310" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <line x1="545" y1="130" x2="545" y2="310" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
    </svg>
  );
}
