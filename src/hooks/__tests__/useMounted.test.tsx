import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useMounted } from "../useMounted";

function MountedValue() {
  return <span>{useMounted() ? "mounted" : "unmounted"}</span>;
}

describe("useMounted", () => {
  it("renders as unmounted on the server", () => {
    expect(renderToString(<MountedValue />)).toContain("unmounted");
  });
});
