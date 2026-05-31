"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type Toast = { id: number; type: "success" | "error" | "warning" | "info"; message: string };

type ToastContextValue = {
  toast: (message: string, type?: Toast["type"]) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const toastStyles: Record<Toast["type"], string> = {
  success: "border-l-4 border-l-[var(--success)] bg-[#0d3321] text-[#1d9e75]",
  error: "border-l-4 border-l-[var(--danger)] bg-[#2d1010] text-[#e74c3c]",
  warning: "border-l-4 border-l-[var(--warning)] bg-[#2d1f0d] text-[#e67e22]",
  info: "border-l-4 border-l-[var(--info)] bg-[#0d1f2d] text-[#3498db]",
};

const toastIcons: Record<Toast["type"], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = toastIcons[t.type];
          return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-in slide-in-from-right-full items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm shadow-lg duration-300",
              toastStyles[t.type]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              className="opacity-70 hover:opacity-100"
              onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
