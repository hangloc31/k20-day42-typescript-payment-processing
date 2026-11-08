# k20-day42-typescript-payment-processing

Ứng dụng TypeScript chạy trên trình duyệt, mô phỏng xử lý thanh toán đơn hàng: nhập mã đơn hàng, số tiền, chọn phương thức thanh toán và nhận biên nhận. Biên nhận được lưu trong bộ nhớ của phiên chạy hiện tại và có thể tra cứu bằng mã biên nhận.

## Yêu cầu

- Node.js >= 20.19 (hoặc >= 22.12)
- npm

## Cài đặt

```bash
git clone https://github.com/hangloc31/k20-day42-typescript-payment-processing.git
cd k20-day42-typescript-payment-processing
npm install
```

## Chạy chương trình

Chạy development server:

```bash
npm run dev
```

Mở địa chỉ Vite in ra, mặc định là http://localhost:5173.

Các lệnh khác:

```bash
npm run typecheck   # kiểm tra kiểu
npm run build       # build production
npm run preview     # xem bản build
```

## Cách sử dụng

1. Nhập **Mã đơn hàng** là số nguyên dương, ví dụ `1001`.
2. Nhập **Số tiền** lớn hơn 0, ví dụ `250000`.
3. Chọn phương thức **COD**, **Chuyển khoản ngân hàng** hoặc **Ví điện tử**.
4. Bấm **Thanh toán**. Nếu dữ liệu hợp lệ, biên nhận mới xuất hiện trong danh sách bên phải.
5. Nhập **Mã biên nhận** và bấm **Tìm biên nhận** để tra cứu lại.
6. Mở **Kiểm thử type guard** để chạy nhanh các trường hợp hợp lệ/không hợp lệ, bao gồm phương thức `CRYPTO` không nằm trong danh sách cho phép.

## Các class xử lý thanh toán phối hợp với nhau như thế nào?

Luồng xử lý nằm trong `src/main.ts`:

```text
Form submit
  → đọc giá trị thô và tạo object unknown
  → isPaymentRequest(value)            (src/guards.ts)
  → createProcessor(request)           (src/processors.ts)
  → PaymentProcessor.pay()             (gọi qua kiểu cha)
  → PaymentResult + PaymentReceipt
  → thêm vào mảng receipts, render danh sách
  → findById(receipts, id) khi tra cứu (src/findById.ts)
```

- **`PaymentProcessor`** là abstract class nhận `orderId` và `amount` qua constructor. Hai giá trị này nằm trong thuộc tính `private readonly`, chỉ đọc ra qua getter nên không thể sửa sau khi khởi tạo. Class khai báo `abstract pay(): PaymentResult` và getter trừu tượng `method`.
- **`CodPaymentProcessor`**, **`BankTransferProcessor`**, **`EWalletPaymentProcessor`** kế thừa `PaymentProcessor`, ghi đè `method` và `pay()`. Mỗi class trả về `PaymentResult` thành công với thông báo riêng cho phương thức của mình.
- **`createProcessor`** là factory: nhận `PaymentRequest` đã được type guard xác thực, chọn class con phù hợp và trả về dưới kiểu `PaymentProcessor`. Nhờ vậy `main.ts` chỉ gọi `processor.pay()` qua kiểu cha (tính đa hình).
- **`isPaymentRequest`** là type guard nhận `unknown`, kiểm tra `orderId` là số nguyên dương, `amount` là số hữu hạn lớn hơn 0 và `method` thuộc ba giá trị hợp lệ. Dữ liệu form không được dùng trực tiếp trước khi qua guard.
- **`findById`** là hàm generic `findById<T extends { id: number }>` dùng chung cho danh sách biên nhận, trả về `T | undefined`.
- **`PaymentReceipt`** do `buildReceipt()` trong lớp cha tạo, với id tăng dần trong phiên chạy.

## Cấu trúc

```text
index.html
public/
└── favicon.svg
src/
├── types.ts       # PaymentMethod, PaymentRequest, PaymentReceipt, PaymentResult
├── guards.ts      # isPaymentRequest, isPaymentMethod
├── findById.ts    # generic findById
├── processors.ts  # PaymentProcessor + 3 class con + createProcessor
├── main.ts        # đọc form, gọi guard/factory, render DOM
├── style.css
└── vite-env.d.ts
```

## Ghi chú

- Không có backend, API hay database; biên nhận chỉ tồn tại trong bộ nhớ và mất khi tải lại trang.
- Đây là mô phỏng thanh toán, không kết nối cổng thanh toán thật và không nhập/lưu thông tin thẻ hay tài khoản ngân hàng.
- Mọi thông báo thành công đến từ class xử lý tương ứng với phương thức thanh toán.
