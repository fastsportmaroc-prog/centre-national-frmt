import { AppBrand } from "@/components/brand/AppBrand";

export function DashboardHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-frmt-green/25 bg-surface">
      <div className="frmt-tricolor" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 50%, var(--frmt-red), transparent), radial-gradient(ellipse 60% 50% at 80% 50%, var(--frmt-green), transparent)",
        }}
      />
      <div className="relative flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:items-center sm:text-left">
        <AppBrand size="xl" centered className="sm:flex-row sm:text-left sm:items-center" />
        <div className="hidden h-20 w-px bg-border sm:block" />
        <p className="max-w-lg text-sm leading-relaxed text-muted sm:ml-auto">
          Plateforme officielle de gestion du{" "}
          <span className="font-semibold text-frmt-green">Centre National</span> — joueurs,
          courts, hébergement, logistique et rapports{" "}
          <span className="font-semibold text-frmt-red">FRMT</span>.
        </p>
      </div>
    </section>
  );
}
