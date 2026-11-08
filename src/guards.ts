import type { PaymentMethod, PaymentRequest } from "./types";

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "COD" || value === "BANK_TRANSFER" || value === "E_WALLET";
}

export function isPaymentRequest(value: unknown): value is PaymentRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("orderId" in value) || !("amount" in value) || !("method" in value)) {
    return false;
  }

  const orderId = value.orderId;
  const amount = value.amount;
  const method = value.method;

  return (
    typeof orderId === "number" &&
    Number.isInteger(orderId) &&
    orderId > 0 &&
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount > 0 &&
    isPaymentMethod(method)
  );
}
