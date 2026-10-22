"use client";

import { createContext, useContext } from "react";

interface EncounterConfiguration {
  moveEncountersBetweenLocations: boolean;
  reducedMotion: boolean;
}

const EncounterConfigurationContext = createContext<EncounterConfiguration>({
  moveEncountersBetweenLocations: false,
  reducedMotion: false,
});

export function EncounterConfigurationProvider({
  children,
  configuration,
}: {
  children: React.ReactNode;
  configuration: EncounterConfiguration;
}) {
  return (
    <EncounterConfigurationContext value={configuration}>
      {children}
    </EncounterConfigurationContext>
  );
}

export const useEncounterConfiguration = () =>
  useContext(EncounterConfigurationContext);
