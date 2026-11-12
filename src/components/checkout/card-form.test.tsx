import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { futureExpiry, TEST_CARDS } from "@/test/fixtures";
import { CardForm } from "./card-form";

/** The Visa test number as the form displays it: four groups of four digits. */
const VISA_GROUPED = TEST_CARDS.visa.match(/.{1,4}/g)!.join(" ");

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<CardForm amountLabel="€10.00" onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

describe("CardForm", () => {
  it("shows the amount on the confirm button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Confirm purchase · €10.00" })).toBeEnabled();
  });

  it("groups the card number in blocks of four while typing", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Card number"), TEST_CARDS.visa);
    expect(screen.getByLabelText("Card number")).toHaveValue(VISA_GROUPED);
  });

  it("shows an error for each invalid field and does not submit", async () => {
    const { user, onSubmit } = renderForm();
    await user.type(screen.getByLabelText("Card number"), TEST_CARDS.invalidChecksum);
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));

    expect(screen.getByText("Enter the name shown on the card.")).toBeInTheDocument();
    expect(screen.getByText("Card number is not valid.")).toBeInTheDocument();
    expect(screen.getByText("Enter the expiry date as MM/YY.")).toBeInTheDocument();
    expect(screen.getByText("Security code must be 3 digits.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a field's error once the field is edited", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));
    expect(screen.getByLabelText("Name on card")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Name on card"), "A");
    expect(screen.getByLabelText("Name on card")).not.toHaveAttribute("aria-invalid");
  });

  it("submits valid details and shows field errors returned by the server", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ cvc: "Security code was rejected." });
    const { user } = renderForm(onSubmit);
    const expiry = futureExpiry();

    await user.type(screen.getByLabelText("Name on card"), "Alex Andersson");
    await user.type(screen.getByLabelText("Card number"), TEST_CARDS.visa);
    await user.type(screen.getByLabelText("Expiry (MM/YY)"), expiry);
    await user.type(screen.getByLabelText("Security code"), "123");
    await user.click(screen.getByRole("button", { name: /Confirm purchase/ }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Alex Andersson",
      number: VISA_GROUPED,
      expiry,
      cvc: "123",
    });
    expect(await screen.findByText("Security code was rejected.")).toBeInTheDocument();
  });
});
