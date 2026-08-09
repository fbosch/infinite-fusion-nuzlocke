/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PokemonComboboxMenu } from "../pokemon-combobox-menu";

vi.mock("@floating-ui/react", () => ({
  FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@headlessui/react", () => ({
  ComboboxOptions: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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
  });
});
