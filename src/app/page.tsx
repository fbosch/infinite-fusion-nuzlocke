import type { Metadata } from "next";
import { LocationTable } from "@/features/encounters";
import { ActivePlaythroughTitle } from "@/features/playthroughs";
import { ErrorBoundary } from "@/shared/ui/error-boundary";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description:
    "Track encounters, fusions, and team state in Pokemon Infinite Fusion Nuzlocke runs.",
};

export default function Home() {
  return (
    <main className="mx-auto max-w-[1500px]" id="main-content">
      <ActivePlaythroughTitle />
      {/* Locations Table Section */}
      <section aria-labelledby="locations-heading" className="2xl:pb-10">
        <h2 className="sr-only" id="locations-heading">
          Game Locations
        </h2>
        <ErrorBoundary className="min-h-[70dvh]">
          <LocationTable />
        </ErrorBoundary>
      </section>
    </main>
  );
}
