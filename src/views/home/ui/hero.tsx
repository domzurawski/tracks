import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui";

export function Hero() {
  return (
    <section className="flex flex-col gap-6 py-16 sm:py-20">
      <h1 className="max-w-3xl font-heading text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
        Log the lap.
        <br />
        Own the <span className="text-accent-500">record.</span>
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
        Track your lap times, compare against real drivers, and see exactly
        where you rank at Nürburgring, Le Mans, and Spa.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button href="/signup" variant="primary">
          Create free account
        </Button>
        <Button href="/leaderboards" variant="secondary">
          Browse leaderboards
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
