/** @vitest-environment jsdom */

import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
