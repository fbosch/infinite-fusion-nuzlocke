import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LocationTable from "@/components/LocationTable";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Track encounters, fusions, and team state in Pokemon Infinite Fusion Nuzlocke runs.",
};

export default function Home() {
  return (
    <main id="main-content" className="max-w-[1500px] mx-auto">
      {/* Locations Table Section */}
      <section aria-labelledby="locations-heading" className="2xl:pb-10">
        <h2 id="locations-heading" className="sr-only">
          Game Locations
        </h2>
        <ErrorBoundary className="min-h-[70dvh]">
          <LocationTable />
        </ErrorBoundary>
      </section>
    </main>
  );
}
