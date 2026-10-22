import type { Metadata } from "next";
import { LocationTable } from "@/features/encounters";
import { ErrorBoundary } from "@/shared/ui/error-boundary";

export const metadata: Metadata = {
  alternates: {
    canonical: "/locations",
  },
  title: "Locations",
};

export default function LocationsPage() {
  return (
    <main className="mx-auto max-w-[1500px]" id="main-content">
      <section aria-labelledby="locations-heading" className="2xl:pb-10">
        <h1 className="sr-only" id="locations-heading">
          Game Locations
        </h1>
        <ErrorBoundary className="min-h-[70dvh]">
          <LocationTable />
        </ErrorBoundary>
      </section>
    </main>
  );
}
