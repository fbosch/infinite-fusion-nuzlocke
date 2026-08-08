/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Footer from "@/components/Footer";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/analytics/CookieSettingsButton", () => ({
  default: () => <button type="button">Cookie settings</button>,
}));

vi.mock("@/components/CreditsModal", () => ({
  default: () => null,
}));

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the current year in the copyright line", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    const copyrightLine = screen.getByText(
      (_content, node) =>
        node?.textContent?.includes(`1995–${currentYear}`) === true,
      { selector: "p" },
    );

    expect(copyrightLine).not.toBeNull();
  });

  it("shows the version line", () => {
    render(<Footer />);

    expect(screen.getByText("Version unknown")).not.toBeNull();
  });
});
