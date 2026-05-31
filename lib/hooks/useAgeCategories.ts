"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultAgeCategories } from "@/lib/v2/categories-age-store";
import {
  getAgeCategories,
  saveAgeCategories,
} from "@/lib/v2/categories-age-store";
import type { AgeCategoryDefinition } from "@/lib/types/categories-age";

export type { AgeCategoryDefinition };

export function useAgeCategories() {
  const [categories, setCategories] = useState<AgeCategoryDefinition[]>(getDefaultAgeCategories);

  const refresh = useCallback(() => {
    setCategories(getAgeCategories());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("frmt:categories-age-changed", onChange);
    return () => window.removeEventListener("frmt:categories-age-changed", onChange);
  }, [refresh]);

  const persist = useCallback(
    (next: AgeCategoryDefinition[]) => {
      saveAgeCategories(next);
      setCategories(next);
    },
    []
  );

  return { categories, persist, refresh };
}
