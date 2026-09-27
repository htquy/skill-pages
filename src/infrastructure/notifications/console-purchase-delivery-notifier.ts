import type {
  PurchaseDelivery,
  PurchaseDeliveryNotifier,
} from "@/src/domain/notifications";

/**
 * Bản triển khai tối giản: ghi nội dung email ra log server.
 *
 * Đây là adapter mặc định cho môi trường local vì dự án không phụ thuộc thư viện
 * gửi mail. Khi lên production, thay bằng adapter SMTP/Resend/SendGrid — chỉ cần
 * hiện thực `PurchaseDeliveryNotifier` và đổi binding trong
 * `src/infrastructure/composition.ts`; Application không phải sửa gì.
 *
 * Lưu ý vận hành: gửi email hỏng KHÔNG được làm hỏng luồng thanh toán, nên
 * tầng Application bắt lỗi riêng cho bước này và ghi AuditLog để đối soát.
 */
export const consolePurchaseDeliveryNotifier: PurchaseDeliveryNotifier = {
  async sendPurchaseConfirmation(delivery: PurchaseDelivery): Promise<void> {
    console.info(
      [
        "[purchase-delivery]",
        `to=${delivery.to}`,
        `order=${delivery.orderCode}`,
        `product=${delivery.productTitle}`,
        `amount=${delivery.amountLabel}`,
        `url=${delivery.productUrl}`,
      ].join(" "),
    );
  },
};
