/** @vitest-environment jsdom */

import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, clampMenuPosition } from "../ContextMenu";

describe("ContextMenu", () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 300,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 200,
    });
  });

  it("keeps the context menu inside the viewport near bottom-right edges", () => {
    expect(
      clampMenuPosition({ x: 280, y: 190 }, { width: 120, height: 80 }),
    ).toEqual({ x: 172, y: 112 });
  });

  it("keeps the requested position when enough viewport space exists", () => {
    expect(
      clampMenuPosition({ x: 100, y: 60 }, { width: 120, height: 80 }),
    ).toEqual({ x: 100, y: 60 });
  });

  it("closes the active menu and suppresses the native menu on unhandled right-clicks", async () => {
    render(
      <ContextMenu items={[{ id: "first", label: "First action" }]}>
        <button type="button">First trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "First trigger" }),
    );
    expect(await screen.findByText("First action")).not.toBeNull();

    const event = createEvent.contextMenu(document.body);
    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText("First action")).toBeNull();
    });
  });

  it("closes without reopening when right-clicking the active trigger", async () => {
    render(
      <ContextMenu items={[{ id: "first", label: "First action" }]}>
        <button type="button">First trigger</button>
      </ContextMenu>,
    );

    const trigger = screen.getByRole("button", { name: "First trigger" });
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("First action")).not.toBeNull();

    const event = createEvent.contextMenu(trigger);
    fireEvent(trigger, event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText("First action")).toBeNull();
    });
  });

  it("closes when left-clicking outside the menu", async () => {
    render(
      <ContextMenu items={[{ id: "first", label: "First action" }]}>
        <button type="button">First trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "First trigger" }),
    );
    expect(await screen.findByText("First action")).not.toBeNull();

    fireEvent.pointerDown(document.body, { button: 0 });

    await waitFor(() => {
      expect(screen.queryByText("First action")).toBeNull();
    });
  });

  it("announces context-menu lifecycle changes for trigger tooltips", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    window.addEventListener("context-menu-open", onOpen);
    window.addEventListener("context-menu-close", onClose);

    render(
      <ContextMenu items={[{ id: "first", label: "First action" }]}>
        <button type="button">Context trigger</button>
      </ContextMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Context trigger" });
    fireEvent.contextMenu(trigger);
    expect(onOpen).toHaveBeenCalledOnce();

    fireEvent.contextMenu(trigger);
    expect(onClose).toHaveBeenCalledOnce();

    window.removeEventListener("context-menu-open", onOpen);
    window.removeEventListener("context-menu-close", onClose);
  });

  it("announces a close when an open menu unmounts", () => {
    const onClose = vi.fn();
    window.addEventListener("context-menu-close", onClose);

    const view = render(
      <ContextMenu items={[{ id: "first", label: "First action" }]}>
        <button type="button">Context trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Context trigger" }),
    );
    view.unmount();

    expect(onClose).toHaveBeenCalledOnce();
    window.removeEventListener("context-menu-close", onClose);
  });

  it("opens submenus with ArrowRight and returns focus with ArrowLeft", async () => {
    render(
      <ContextMenu
        items={[
          {
            id: "parent",
            label: "Parent action",
            children: [{ id: "child", label: "Child action" }],
          },
        ]}
      >
        <button type="button">Context trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Context trigger" }),
    );
    const parent = await screen.findByRole("menuitem", {
      name: /Parent action/,
    });
    parent.focus();
    fireEvent.keyDown(parent, { key: "ArrowRight" });

    const child = await screen.findByRole("menuitem", { name: "Child action" });
    await waitFor(() => {
      expect(document.activeElement).toBe(child);
    });
    fireEvent.keyDown(child, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(parent);
  });

  it("does not navigate disabled links", async () => {
    render(
      <ContextMenu
        items={[
          {
            id: "disabled-link",
            label: "Disabled link",
            href: "https://example.com",
            disabled: true,
          },
        ]}
      >
        <button type="button">Context trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Context trigger" }),
    );
    const link = await screen.findByRole("menuitem", { name: "Disabled link" });
    const event = createEvent.click(link);
    fireEvent(link, event);

    expect(event.defaultPrevented).toBe(true);
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });

  it("opens another custom menu instead of showing the native menu", async () => {
    render(
      <>
        <ContextMenu items={[{ id: "first", label: "First action" }]}>
          <button type="button">First trigger</button>
        </ContextMenu>
        <ContextMenu items={[{ id: "second", label: "Second action" }]}>
          <button type="button">Second trigger</button>
        </ContextMenu>
      </>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "First trigger" }),
    );
    expect(await screen.findByText("First action")).not.toBeNull();

    const secondTrigger = screen.getByRole("button", {
      name: "Second trigger",
    });
    const event = createEvent.contextMenu(secondTrigger);
    fireEvent(secondTrigger, event);

    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByText("Second action")).not.toBeNull();
    await waitFor(() => {
      expect(screen.queryByText("First action")).toBeNull();
    });
  });
});
