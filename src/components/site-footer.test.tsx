import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the delivery promise and contact address", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Free delivery on every order");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("hello@fikasupply.example");
  });
});
