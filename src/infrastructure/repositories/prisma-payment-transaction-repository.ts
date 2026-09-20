import { prisma } from "@/src/infrastructure/database/prisma";
import type { PaymentStatus, PaymentTransaction, PaymentTransactionRepository, PaymentTransactionView } from "@/src/domain/payments";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toTransaction(row: {
  id: string;
  orderId: string;
  provider: string;
  providerTransactionId: string;
  amount: { toString(): string } | number | null;
  status: string;
  rawPayload: unknown;
  paidAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
}): PaymentTransaction {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    providerTransactionId: row.providerTransactionId,
    amount: Number(row.amount),
    status: row.status as PaymentStatus,
    rawPayload: (row.rawPayload as Record<string, unknown> | null) ?? null,
    paidAt: row.paidAt,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

export const prismaPaymentTransactionRepository: PaymentTransactionRepository = {
  async findByProviderTransactionId(providerTransactionId) {
    const row = await prisma.paymentTransaction.findUnique({
      where: { providerTransactionId },
    });
    return row ? toTransaction(row) : null;
  },

  async create(input) {
    const row = await prisma.paymentTransaction.create({
      data: {
        orderId: input.orderId,
        provider: input.provider,
        providerTransactionId: input.providerTransactionId,
        amount: input.amount,
        status: input.status,
        rawPayload: input.rawPayload as object | undefined,
        paidAt: input.paidAt,
        verifiedAt: input.verifiedAt,
      },
    });
    return toTransaction(row);
  },

  async listForAdmin(pagination) {
    const [rows, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        include: { order: { include: { skill: { select: { title: true } } } } },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.paymentTransaction.count(),
    ]);
    const items: PaymentTransactionView[] = rows.map((row) => ({
      ...toTransaction(row),
      orderCode: row.order.orderCode,
      skillTitle: row.order.skill.title,
    }));
    return toPaginated(items, total, pagination);
  },
};