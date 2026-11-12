import type { ValidCard } from "@/lib/card";
import type { Currency } from "@/lib/types";

/**
 * Simulated payment authorization. The store runs in test mode: no payment
 * provider is contacted and no money moves. Every valid card is approved
 * except the documented test card below, which is always declined.
 */

/** Test card that is always declined. Documented in README.md and docs/api.md. */
export const DECLINED_TEST_CARD_NUMBER = "4000000000000002";

export type PaymentRequest = {
  card: ValidCard;
  amount: number;
  currency: Currency;
};

export type PaymentResult =
  { status: "approved"; authorizationId: string } | { status: "declined"; reason: "card_declined" };

export function authorizePayment(
  request: PaymentRequest,
  createId: () => string = () => crypto.randomUUID(),
): PaymentResult {
  if (request.card.number === DECLINED_TEST_CARD_NUMBER) {
    return { status: "declined", reason: "card_declined" };
  }
  return { status: "approved", authorizationId: `auth_${createId()}` };
}
