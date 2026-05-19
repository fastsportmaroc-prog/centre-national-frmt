"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Props = {
  title: string;
  description?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
};

export function Header({ title, description, onMenuClick, actions }: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 md:hidden"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {!isSupabaseConfigured() && (
          <span className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
            Données de démonstration (Supabase non configuré)
          </span>
        )}
      </div>
    </header>
  );
}
