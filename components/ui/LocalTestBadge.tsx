"use client";

import { useEffect, useState } from "react";
import { isLocalTestModeClient } from "@/lib/local-test/mode";

export function LocalTestBadge() {
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    setLocalMode(isLocalTestModeClient());
  }, []);

  if (!localMode) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
      Mode local test
    </span>
  );
}
