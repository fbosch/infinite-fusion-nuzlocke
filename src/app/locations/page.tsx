import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LocationTable from "@/components/LocationTable";

export const metadata: Metadata = {
  title: "Locations",
  alternates: {
    canonical: "/locations",
  },
};

export default function LocationsPage() {
  return (
    <main id="main-content" className="max-w-[1500px] mx-auto">
      <section aria-labelledby="locations-heading" className="2xl:pb-10">
        <h1 id="locations-heading" className="sr-only">
          Game Locations
        </h1>
        <ErrorBoundary className="min-h-[70dvh]">
          <LocationTable />
        </ErrorBoundary>
      </section>
    </main>
  );
}
