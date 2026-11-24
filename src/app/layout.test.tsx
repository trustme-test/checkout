import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("sets the default title and description", () => {
    expect(metadata.title).toEqual({
      default: "Fika Supply Co.",
      template: "%s · Fika Supply Co.",
    });
    expect(metadata.description).toBe("Small-batch coffee and brewing gear, delivered.");
  });

  it("wraps the page in the header, main content and footer", () => {
    const html = renderToString(
      RootLayout({ children: <p>Page body</p>, params: Promise.resolve({}) }),
    );

    expect(html).toContain('lang="en"');
    expect(html).toContain("Page body");
    expect(html).toContain("Fika Supply Co.");
    expect(html).toContain("<main");
  });
});
