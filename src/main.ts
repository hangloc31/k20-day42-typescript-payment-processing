import "./style.css";

import { findById } from "./findById";
import { isPaymentRequest } from "./guards";
import { createProcessor } from "./processors";
import type { PaymentProcessor } from "./processors";
import type { PaymentMethod, PaymentReceipt } from "./types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  E_WALLET: "Ví điện tử",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * querySelector trả về null nếu không tìm thấy, nên luôn kiểm tra trước khi dùng.
 */
function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Không tìm thấy phần tử "${selector}".`);
  }

  return element;
}

const paymentForm = getElement<HTMLFormElement>("#payment-form");
const orderIdInput = getElement<HTMLInputElement>("#order-id");
const amountInput = getElement<HTMLInputElement>("#amount");
const methodSelect = getElement<HTMLSelectElement>("#payment-method");
const paymentFeedback = getElement<HTMLDivElement>("#payment-feedback");

const receiptList = getElement<HTMLUListElement>("#receipt-list");
const receiptCount = getElement<HTMLSpanElement>("#receipt-count");
const receiptsEmpty = getElement<HTMLParagraphElement>("#receipts-empty");

const searchForm = getElement<HTMLFormElement>("#search-form");
const receiptIdInput = getElement<HTMLInputElement>("#receipt-id");
const searchFeedback = getElement<HTMLDivElement>("#search-feedback");

const guardDemoButton = getElement<HTMLButtonElement>("#guard-demo");
const guardResults = getElement<HTMLUListElement>("#guard-results");

// Biên nhận chỉ lưu trong bộ nhớ của phiên chạy hiện tại.
const receipts: PaymentReceipt[] = [];

type FeedbackKind = "success" | "error";

function showFeedback(
  target: HTMLDivElement,
  kind: FeedbackKind,
  content: string | Node,
): void {
  target.hidden = false;
  target.className = `feedback feedback--${kind}`;
  target.setAttribute("role", kind === "error" ? "alert" : "status");
  target.replaceChildren();

  if (typeof content === "string") {
    target.textContent = content;
  } else {
    target.append(content);
  }
}

function createReceiptCard(receipt: PaymentReceipt): HTMLElement {
  const card = document.createElement("article");
  card.className = "receipt";

  const header = document.createElement("div");
  header.className = "receipt-header";

  const title = document.createElement("strong");
  title.textContent = `Biên nhận #${receipt.id}`;

  const method = document.createElement("span");
  method.className = "badge";
  method.textContent = METHOD_LABELS[receipt.method];

  header.append(title, method);

  const summary = document.createElement("p");
  summary.className = "receipt-summary";
  summary.textContent = `Đơn hàng #${receipt.orderId} · ${formatCurrency(receipt.amount)}`;

  const message = document.createElement("p");
  message.className = "receipt-message";
  message.textContent = receipt.message;

  card.append(header, summary, message);
  return card;
}

function renderReceipts(): void {
  receiptList.replaceChildren();
  receiptCount.textContent = String(receipts.length);
  receiptsEmpty.hidden = receipts.length > 0;

  for (const receipt of receipts) {
    const item = document.createElement("li");
    item.append(createReceiptCard(receipt));
    receiptList.append(item);
  }
}

function createSuccessContent(receipt: PaymentReceipt): HTMLElement {
  const wrapper = document.createElement("div");

  const title = document.createElement("strong");
  title.textContent = "Thanh toán thành công!";

  const details = document.createElement("p");
  details.textContent = `Biên nhận #${receipt.id} · Đơn hàng #${receipt.orderId} · ${formatCurrency(receipt.amount)}`;

  const message = document.createElement("p");
  message.textContent = receipt.message;

  wrapper.append(title, details, message);
  return wrapper;
}

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const orderIdRaw = orderIdInput.value.trim();
  const amountRaw = amountInput.value.trim();

  if (orderIdRaw === "") {
    showFeedback(paymentFeedback, "error", "Vui lòng nhập mã đơn hàng.");
    orderIdInput.focus();
    return;
  }

  if (amountRaw === "") {
    showFeedback(paymentFeedback, "error", "Vui lòng nhập số tiền.");
    amountInput.focus();
    return;
  }

  // Dữ liệu từ form luôn bắt đầu ở dạng unknown và phải đi qua type guard.
  const candidate: unknown = {
    orderId: Number(orderIdRaw),
    amount: Number(amountRaw),
    method: methodSelect.value,
  };

  if (!isPaymentRequest(candidate)) {
    showFeedback(
      paymentFeedback,
      "error",
      "Dữ liệu thanh toán không hợp lệ. Mã đơn hàng phải là số nguyên dương, số tiền phải lớn hơn 0 và phương thức thanh toán phải hợp lệ.",
    );
    return;
  }

  // Gọi pay() qua kiểu cha PaymentProcessor.
  const processor: PaymentProcessor = createProcessor(candidate);
  const result = processor.pay();

  if (result.status === "error") {
    showFeedback(paymentFeedback, "error", result.message);
    return;
  }

  receipts.push(result.data);
  renderReceipts();
  showFeedback(paymentFeedback, "success", createSuccessContent(result.data));
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const raw = receiptIdInput.value.trim();

  if (raw === "") {
    showFeedback(searchFeedback, "error", "Vui lòng nhập mã biên nhận.");
    receiptIdInput.focus();
    return;
  }

  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    showFeedback(
      searchFeedback,
      "error",
      "Mã biên nhận phải là số nguyên dương.",
    );
    return;
  }

  const receipt = findById(receipts, id);

  if (receipt === undefined) {
    showFeedback(
      searchFeedback,
      "error",
      `Không tìm thấy biên nhận có mã ${id}.`,
    );
    return;
  }

  showFeedback(searchFeedback, "success", createReceiptCard(receipt));
});

interface GuardCase {
  label: string;
  value: unknown;
  expected: boolean;
}

const guardCases: GuardCase[] = [
  {
    label: "Yêu cầu COD hợp lệ",
    value: { orderId: 1001, amount: 250000, method: "COD" },
    expected: true,
  },
  {
    label: "Phương thức CRYPTO không nằm trong danh sách cho phép",
    value: { orderId: 1001, amount: 250000, method: "CRYPTO" },
    expected: false,
  },
  {
    label: "orderId bằng 0",
    value: { orderId: 0, amount: 250000, method: "COD" },
    expected: false,
  },
  {
    label: "amount âm",
    value: { orderId: 1001, amount: -1, method: "COD" },
    expected: false,
  },
];

guardDemoButton.addEventListener("click", () => {
  guardResults.replaceChildren();

  for (const testCase of guardCases) {
    const actual = isPaymentRequest(testCase.value);
    const passed = actual === testCase.expected;

    const item = document.createElement("li");
    item.className = passed ? "guard-pass" : "guard-fail";
    item.textContent = `${passed ? "Đạt" : "Không đạt"}: ${testCase.label} → isPaymentRequest = ${String(actual)}`;
    guardResults.append(item);
  }
});

renderReceipts();
