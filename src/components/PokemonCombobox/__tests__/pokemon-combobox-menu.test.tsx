/** @vitest-environment jsdom */

import { useVirtualizer } from "@tanstack/react-virtual";
import { render, screen } from "@testing-library/react";
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
  it("attaches the virtualizer scroll container without imperatively measuring it", () => {
    const measure = vi.fn();
    const setOptionsReference = vi.fn();
    const virtualizer = {
      getTotalSize: () => 5600,
      isScrolling: false,
      measure,
    };

    render(
      <PokemonComboboxMenu
        floatingStyles={{}}
        hasRoundedEdges={false}
        optionsContent={<span>Pikachu</span>}
        placement="bottom-start"
        setOptionsReference={setOptionsReference}
        shouldVirtualize={true}
        virtualizer={virtualizer}
      />,
    );

    expect(screen.getByText("Pikachu")).toBeTruthy();
    expect(setOptionsReference).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
    );
    expect(measure).not.toHaveBeenCalled();
    const optionsCanvas = screen.getByText("Pikachu").parentElement;
    expect(optionsCanvas?.style.height).toBe("5600px");
    expect(optionsCanvas?.style.position).toBe("relative");
  });

  it("renders the initial virtual range when its portal viewport mounts", () => {
    let reportViewportRect:
      | ((rect: { height: number; width: number }) => void)
      | undefined;

    function VirtualizedPortalMenu() {
      const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
        null,
      );
      const virtualizer = useVirtualizer({
        count: 100,
        estimateSize: () => 56,
        getScrollElement: () => scrollElement,
        initialRect: { height: 500, width: 0 },
        observeElementRect: (_instance, callback) => {
          reportViewportRect = callback;
          return unsubscribe;
        },
      });

      return (
        <div ref={setScrollElement}>
          {virtualizer.getVirtualItems().map((item) => (
            <span key={item.key}>Option {item.index}</span>
          ))}
        </div>
      );
    }

    render(<VirtualizedPortalMenu />);

    expect(screen.getByText("Option 0")).toBeTruthy();
    expect(reportViewportRect).toBeTruthy();
  });
});
