import { prisma } from "@/src/infrastructure/database/prisma";
import { getSePayConfig, isSePayConfigured } from "@/src/lib/env";
import { matchesAmount } from "@/src/domain/shared";
import type {
  ConfirmPaymentInput,
  PaymentConfirmationReason,
  PaymentConfirmationResult,
  PaymentGatewayService,
} from "@/src/domain/payments";

/**
 * Ranh giới giao dịch (transactional boundary) của luồng tiền.
 *
 * Toàn bộ quy tắc bất biến của Commerce nằm gọn trong MỘT transaction DB:
 *
 *   1 mã giao dịch của provider => tối đa 1 PaymentTransaction
 *   1 đơn PENDING + đúng số tiền => 1 Order PAID
 *   1 (user, skill) => tối đa 1 SkillAccess đang hoạt động
 *
 * Nhờ đó webhook gửi lặp, hoặc hai webhook đến cùng lúc, đều không thể làm
 * doanh thu hoặc quyền truy cập bị nhân đôi.
 */
export const prismaPaymentGateway: PaymentGatewayService = {
  async confirmPayment(input: ConfirmPaymentInput): Promise<PaymentConfirmationResult> {
    return prisma.$transaction(async (tx) => {
      // 1) Chống trùng ở mức giao dịch tiền.
      const existing = await tx.paymentTransaction.findUnique({
        where: { providerTransactionId: input.providerTransactionId },
      });

      if (existing) {
        return {
          handled: true,
          reason: "already_processed",
          orderId: existing.orderId,
          orderCode: null,
        };
      }

      // 2) Tìm đơn theo mã trích từ nội dung chuyển khoản.
      const order = await tx.order.findUnique({
        where: { orderCode: input.orderCode },
      });

      if (!order) {
        return { handled: false, reason: "unknown_order", orderId: null, orderCode: input.orderCode };
      }

      // 3) Tiền phải vào đúng tài khoản nhận của shop.
      // Chỉ áp dụng khi đang chạy SePay thật: provider giả lập dùng tài khoản
      // riêng nên so với tài khoản shop sẽ luôn lệch. Khi đã cấu hình SePay thì
      // thiếu số tài khoản trong webhook cũng bị từ chối (fail closed).
      const expectedAccount = isSePayConfigured()
        ? getSePayConfig().expectedAccountNumber
        : "";
      const receivedAccount = input.accountNumber ?? "";
      if (expectedAccount && receivedAccount !== expectedAccount) {
        return {
          handled: false,
          reason: "recipient_mismatch",
          orderId: order.id,
          orderCode: order.orderCode,
        };
      }

      // 4) Chỉ đơn PENDING mới thanh toán được.
      if (order.status !== "PENDING") {
        const reason: PaymentConfirmationReason =
          order.status === "PAID" ? "already_processed" : "not_payable";
        return { handled: false, reason, orderId: order.id, orderCode: order.orderCode };
      }

      // 5) Đơn đã quá hạn thì KHÔNG tự mở khoá: chuyển sang đối soát thủ công để
      // tránh trao quyền cho một đơn đã "chết" (xem README — Business rules).
      if (order.expiresAt.getTime() < Date.now()) {
        return { handled: false, reason: "expired", orderId: order.id, orderCode: order.orderCode };
      }

      // 6) Số tiền phải khớp tuyệt đối (VND: đơn 49000, chuyển 48000 => từ chối).
      if (!matchesAmount(Number(order.amount), order.currency, input.amount)) {
        return { handled: false, reason: "amount_mismatch", orderId: order.id, orderCode: order.orderCode };
      }

      // 7) Giao dịch báo thất bại: ghi lại để đối soát nhưng không mở khoá.
      if (input.status === "FAILED") {
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: input.provider,
            providerTransactionId: input.providerTransactionId,
            amount: input.amount,
            status: "FAILED",
            paidAt: null,
            verifiedAt: new Date(),
            webhookEventId: input.webhookEventId ?? null,
            rawPayload: input.rawPayload as object | undefined,
          },
        });
        return { handled: false, reason: "failed", orderId: order.id, orderCode: order.orderCode };
      }

      // 8) Thành công: giao dịch + đơn + quyền truy cập, tất cả trong 1 transaction.
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: input.provider,
          providerTransactionId: input.providerTransactionId,
          amount: input.amount,
          status: "SUCCESS",
          paidAt: input.paidAt ?? new Date(),
          verifiedAt: new Date(),
          webhookEventId: input.webhookEventId ?? null,
          rawPayload: input.rawPayload as object | undefined,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: input.paidAt ?? new Date() },
      });

      await tx.skillAccess.upsert({
        where: {
          userId_skillId: { userId: order.userId, skillId: order.skillId },
        },
        create: {
          userId: order.userId,
          skillId: order.skillId,
          orderId: order.id,
          source: "ORDER",
        },
        update: {
          revokedAt: null,
        },
      });

      return { handled: true, reason: "ok", orderId: order.id, orderCode: order.orderCode };
    });
  },
};
