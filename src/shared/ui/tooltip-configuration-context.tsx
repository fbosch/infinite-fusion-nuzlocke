"use client";

import { createContext, type ReactNode, useContext } from "react";

interface TooltipConfiguration {
  isDragging: boolean;
  reducedMotion: boolean;
}

const defaultConfiguration: TooltipConfiguration = {
  isDragging: false,
  reducedMotion: false,
};

const TooltipConfigurationContext = createContext(defaultConfiguration);

interface TooltipConfigurationProviderProps extends TooltipConfiguration {
  children: ReactNode;
}

export function TooltipConfigurationProvider({
  children,
  isDragging,
  reducedMotion,
}: TooltipConfigurationProviderProps) {
  return (
    <TooltipConfigurationContext.Provider value={{ isDragging, reducedMotion }}>
      {children}
    </TooltipConfigurationContext.Provider>
  );
}

export function useTooltipConfiguration(): TooltipConfiguration {
  return useContext(TooltipConfigurationContext);
}
