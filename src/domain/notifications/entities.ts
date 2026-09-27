/**
 * Cổng giao diện gửi thông báo cho khách hàng (module Commerce).
 *
 * Tầng Application chỉ biết interface này, không biết SMTP/Resend/Resend API.
 * Khi thanh toán thành công, hệ thống phải tự giao sản phẩm: link mở khóa skill
 * được gửi qua email để khách không mất quyền truy cập nếu đóng trình duyệt.
 */
export interface PurchaseDelivery {
  /** Email nhận hàng (snapshot từ order). */
  to: string;
  recipientName: string | null;
  orderCode: string;
  productTitle: string;
  /** Link tuyệt đối tới trang sản phẩm đã mở khóa. */
  productUrl: string;
  /** Số tiền đã format sẵn để tầng infra không cần biết quy tắc tiền tệ. */
  amountLabel: string;
  paidAt: Date;
}

export interface PurchaseDeliveryNotifier {
  /**
   * Gửi email bàn giao sản phẩm.
   * Ném lỗi khi gửi hỏng để tầng Application ghi nhận (không được nuốt lỗi âm thầm,
   * vì khách đã trả tiền mà không nhận được link là lỗi nghiêm trọng).
   */
  sendPurchaseConfirmation(delivery: PurchaseDelivery): Promise<void>;
}
