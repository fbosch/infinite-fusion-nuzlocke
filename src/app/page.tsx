import type { Metadata } from "next";
import { ActivePlaythroughTitle } from "@/components/ActivePlaythroughTitle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LocationTable from "@/components/LocationTable";

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
