/** @vitest-environment jsdom */

import { useVirtualizer } from "@tanstack/react-virtual";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PokemonComboboxMenu } from "../pokemon-combobox-menu";

const unsubscribe = () => undefined;

vi.mock("@floating-ui/react", () => ({
  FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@headlessui/react", () => ({
  ComboboxOptions: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
}));

describe("PokemonComboboxMenu", () => {
  it("sizes a virtual canvas inside the scroll viewport", () => {
    const setOptionsReference = vi.fn();
    render(
      <PokemonComboboxMenu
        floatingStyles={{}}
        hasRoundedEdges={false}
        optionsContent={<span>Pikachu</span>}
        placement="bottom-start"
        setOptionsReference={setOptionsReference}
        shouldVirtualize={true}
        virtualization={{ isScrolling: false, totalSize: 5600 }}
      />,
    );

    expect(screen.getByText("Pikachu")).toBeTruthy();
    expect(setOptionsReference).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
    );
    const optionsCanvas = screen.getByText("Pikachu").parentElement;
    const scrollContainer = optionsCanvas?.parentElement;

    expect(scrollContainer?.style.height).toBe("");
    expect(optionsCanvas?.style.height).toBe("5600px");
    expect(optionsCanvas?.style.position).toBe("relative");
  });

  it("renders the initial virtual range when its portal viewport mounts", () => {
    let reportViewportRect:
      | ((rect: { height: number; width: number }) => void)
      | undefined;
    let reportScrollOffset:
      | ((offset: number, isScrolling: boolean) => void)
      | undefined;

    function VirtualizedPortalMenu() {
      const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
        null,
      );
      const virtualizer = useVirtualizer({
        count: 100,
        estimateSize: () => 56,
        getScrollElement: () => scrollElement,
        observeElementOffset: (_instance, callback) => {
          reportScrollOffset = callback;
          return unsubscribe;
        },
        observeElementRect: (_instance, callback) => {
          reportViewportRect = callback;
          return unsubscribe;
        },
        overscan: 10,
      });

      return (
        <PokemonComboboxMenu
          floatingStyles={{}}
          hasRoundedEdges={false}
          optionsContent={virtualizer
            .getVirtualItems()
            .map((item) => <span key={item.key}>Option {item.index}</span>)}
          placement="bottom-start"
          setOptionsReference={setScrollElement}
          shouldVirtualize={true}
          virtualization={{
            isScrolling: virtualizer.isScrolling,
            totalSize: virtualizer.getTotalSize(),
          }}
        />
      );
    }

    render(<VirtualizedPortalMenu />);

    expect(reportViewportRect).toBeTruthy();
    expect(reportScrollOffset).toBeTruthy();

    act(() => {
      reportViewportRect?.({ height: 500, width: 0 });
      reportScrollOffset?.(0, false);
    });

    expect(screen.getByText("Option 0")).toBeTruthy();
    expect(screen.getByText("Option 18")).toBeTruthy();

    act(() => {
      reportScrollOffset?.(1200, false);
    });

    expect(screen.getByText("Option 20")).toBeTruthy();
    expect(screen.queryByText("Option 0")).toBeNull();
  });
});
