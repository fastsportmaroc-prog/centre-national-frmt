import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-tennis/50 focus:outline-none focus:ring-1 focus:ring-tennis/30",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-muted">
      {children}
    </label>
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-tennis/50 focus:outline-none focus:ring-1 focus:ring-tennis/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-tennis/50 focus:outline-none focus:ring-1 focus:ring-tennis/30",
        className
      )}
      {...props}
    />
  );
}
