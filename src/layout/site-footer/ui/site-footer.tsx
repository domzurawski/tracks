import { siteConfig } from "@/shared/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t-2 border-divider px-6 py-8 sm:flex-row md:px-12">
      <span className="font-heading text-sm font-extrabold">
        {siteConfig.name}
      </span>
      <span className="text-xs text-foreground/50">
        Lap times logged by the community. Not affiliated with any circuit.
      </span>
    </footer>
  );
}
