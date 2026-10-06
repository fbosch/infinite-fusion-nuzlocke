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
import { ContextMenu, clampMenuPosition } from "../context-menu";

const parentAction = /Parent action/;

describe("ContextMenu", () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 300,
      writable: true,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 200,
      writable: true,
    });
  });

  it("keeps the context menu inside the viewport near bottom-right edges", () => {
    expect(
      clampMenuPosition({ x: 280, y: 190 }, { height: 80, width: 120 }),
    ).toEqual({ x: 172, y: 112 });
  });

  it("keeps the requested position when enough viewport space exists", () => {
    expect(
      clampMenuPosition({ x: 100, y: 60 }, { height: 80, width: 120 }),
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

  it("announces context-menu lifecycle changes for trigger tooltips", () => {
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
            children: [{ id: "child", label: "Child action" }],
            id: "parent",
            label: "Parent action",
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
      name: parentAction,
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

  it("moves focus between menu items with arrow keys", async () => {
    render(
      <ContextMenu
        items={[
          { id: "first", label: "First action" },
          { id: "second", label: "Second action" },
        ]}
      >
        <button type="button">Context trigger</button>
      </ContextMenu>,
    );

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Context trigger" }),
    );
    const first = await screen.findByRole("menuitem", {
      name: "First action",
    });
    const second = screen.getByRole("menuitem", { name: "Second action" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });

    await waitFor(() => {
      expect(document.activeElement).toBe(second);
    });
  });

  it.each(["Enter", " "])("opens submenus with %s", async (key) => {
    render(
      <ContextMenu
        items={[
          {
            children: [{ id: "child", label: "Child action" }],
            id: "parent",
            label: "Parent action",
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
      name: parentAction,
    });
    parent.focus();
    fireEvent.keyDown(parent, { key });

    const child = await screen.findByRole("menuitem", {
      name: "Child action",
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(child);
    });
    expect(parent.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not navigate disabled links", async () => {
    render(
      <ContextMenu
        items={[
          {
            disabled: true,
            href: "https://example.com",
            id: "disabled-link",
            label: "Disabled link",
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
