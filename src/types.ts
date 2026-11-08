export type PaymentMethod = "COD" | "BANK_TRANSFER" | "E_WALLET";

export interface PaymentRequest {
  orderId: number;
  amount: number;
  method: PaymentMethod;
}

export interface PaymentReceipt {
  id: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  message: string;
}

export type PaymentResult =
  | { status: "success"; data: PaymentReceipt }
  | { status: "error"; message: string };
