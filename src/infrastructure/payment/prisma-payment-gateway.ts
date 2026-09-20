import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  ConfirmPaymentInput,
  PaymentConfirmationReason,
  PaymentConfirmationResult,
  PaymentGatewayService,
} from "@/src/domain/payments";

export const prismaPaymentGateway: PaymentGatewayService = {
  async confirmPayment(input: ConfirmPaymentInput): Promise<PaymentConfirmationResult> {
    return prisma.$transaction(async (tx) => {
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

      const order = await tx.order.findUnique({
        where: { orderCode: input.orderCode },
        include: { skill: { select: { title: true, slug: true } } },
      });

      if (!order) {
        return { handled: false, reason: "unknown_order", orderId: null, orderCode: input.orderCode };
      }

      if (order.status !== "PENDING") {
        const reason: PaymentConfirmationReason =
          order.status === "PAID" ? "already_processed" : "not_payable";
        return { handled: false, reason, orderId: order.id, orderCode: order.orderCode };
      }

      if (Number(order.amount) !== Number(input.amount)) {
        return { handled: false, reason: "amount_mismatch", orderId: order.id, orderCode: order.orderCode };
      }

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
            rawPayload: input.rawPayload as object | undefined,
          },
        });
        return { handled: false, reason: "failed", orderId: order.id, orderCode: order.orderCode };
      }

      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: input.provider,
          providerTransactionId: input.providerTransactionId,
          amount: input.amount,
          status: "SUCCESS",
          paidAt: input.paidAt ?? new Date(),
          verifiedAt: new Date(),
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