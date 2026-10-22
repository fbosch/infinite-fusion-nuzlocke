"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface GlobalTooltipContextType {
  isAnyTooltipVisible: boolean;
  registerTooltip: (isVisible: boolean) => void;
}

const GlobalTooltipContext = createContext<GlobalTooltipContextType | null>(
  null,
);
const noop = () => undefined;

interface GlobalTooltipProviderProps {
  children: ReactNode;
}

export function GlobalTooltipProvider({
  children,
}: GlobalTooltipProviderProps) {
  const [visibleTooltipCount, setVisibleTooltipCount] = useState(0);

  const registerTooltip = (isVisible: boolean) => {
    setVisibleTooltipCount((prev) => {
      if (isVisible) {
        return prev + 1;
      }
      return Math.max(0, prev - 1);
    });
  };

  const isAnyTooltipVisible = visibleTooltipCount > 0;

  return (
    <GlobalTooltipContext.Provider
      value={{
        isAnyTooltipVisible,
        registerTooltip,
      }}
    >
      {children}
    </GlobalTooltipContext.Provider>
  );
}

export function useGlobalTooltip() {
  const context = useContext(GlobalTooltipContext);
  if (!context) {
    return {
      isAnyTooltipVisible: false,
      registerTooltip: noop,
    };
  }
  return context;
}
