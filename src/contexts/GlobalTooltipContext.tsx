'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface GlobalTooltipContextType {
  isAnyTooltipVisible: boolean;
  registerTooltip: (isVisible: boolean) => void;
}

const GlobalTooltipContext = createContext<GlobalTooltipContextType | null>(
  null
);

interface GlobalTooltipProviderProps {
  children: ReactNode;
}

export function GlobalTooltipProvider({
  children,
}: GlobalTooltipProviderProps) {
  const [visibleTooltipCount, setVisibleTooltipCount] = useState(0);

  const registerTooltip = useCallback((isVisible: boolean) => {
    setVisibleTooltipCount(prev => {
      if (isVisible) {
        return prev + 1;
      } else {
        return Math.max(0, prev - 1);
      }
    });
  }, []);

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
    // Return default values when not within provider
    return {
      isAnyTooltipVisible: false,
      registerTooltip: () => {},
    };
  }
  return context;
}
