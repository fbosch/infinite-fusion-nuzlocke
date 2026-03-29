/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Footer from "@/components/Footer";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({
    ref: vi.fn(),
    inView: true,
  }),
}));

vi.mock("react-github-btn", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/analytics/CookieSettingsButton", () => ({
  default: () => <button type="button">Cookie settings</button>,
}));

vi.mock("@/components/CreditsModal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: () => true,
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
