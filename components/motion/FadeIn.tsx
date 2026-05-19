"use client";

import { cn } from "@/lib/utils/cn";

type FadeProps = React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  duration?: number;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.35,
  style,
  ...props
}: FadeProps) {
  return (
    <div
      className={cn("frmt-fade-in", className)}
      style={{
        ...style,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("frmt-stagger-list", className)}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("frmt-stagger-item", className)}>{children}</div>;
}
