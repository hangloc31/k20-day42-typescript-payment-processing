import type {
  PaymentMethod,
  PaymentReceipt,
  PaymentRequest,
  PaymentResult,
} from "./types";

let receiptCounter = 0;

function nextReceiptId(): number {
  receiptCounter += 1;
  return receiptCounter;
}

/**
 * Lớp cơ sở cho mọi phương thức thanh toán.
 * orderId và amount là private readonly nên không thể sửa sau khi khởi tạo.
 */
export abstract class PaymentProcessor {
  private readonly orderIdValue: number;
  private readonly amountValue: number;

  constructor(orderId: number, amount: number) {
    this.orderIdValue = orderId;
    this.amountValue = amount;
  }

  get orderId(): number {
    return this.orderIdValue;
  }

  get amount(): number {
    return this.amountValue;
  }

  abstract get method(): PaymentMethod;

  abstract pay(): PaymentResult;

  protected buildReceipt(message: string): PaymentReceipt {
    return {
      id: nextReceiptId(),
      orderId: this.orderIdValue,
      amount: this.amountValue,
      method: this.method,
      message,
    };
  }
}

export class CodPaymentProcessor extends PaymentProcessor {
  get method(): PaymentMethod {
    return "COD";
  }

  pay(): PaymentResult {
    return {
      status: "success",
      data: this.buildReceipt(
        "Đã ghi nhận thanh toán khi nhận hàng (COD).",
      ),
    };
  }
}

export class BankTransferProcessor extends PaymentProcessor {
  get method(): PaymentMethod {
    return "BANK_TRANSFER";
  }

  pay(): PaymentResult {
    return {
      status: "success",
      data: this.buildReceipt("Đã ghi nhận chuyển khoản ngân hàng."),
    };
  }
}

export class EWalletPaymentProcessor extends PaymentProcessor {
  get method(): PaymentMethod {
    return "E_WALLET";
  }

  pay(): PaymentResult {
    return {
      status: "success",
      data: this.buildReceipt("Đã ghi nhận thanh toán qua ví điện tử."),
    };
  }
}

/**
 * Factory chọn class xử lý phù hợp và trả về qua kiểu cha PaymentProcessor.
 */
export function createProcessor(request: PaymentRequest): PaymentProcessor {
  switch (request.method) {
    case "COD":
      return new CodPaymentProcessor(request.orderId, request.amount);
    case "BANK_TRANSFER":
      return new BankTransferProcessor(request.orderId, request.amount);
    case "E_WALLET":
      return new EWalletPaymentProcessor(request.orderId, request.amount);
    default: {
      const exhaustiveCheck: never = request.method;
      throw new Error(
        `Phương thức thanh toán không hợp lệ: ${String(exhaustiveCheck)}`,
      );
    }
  }
}
