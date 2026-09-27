import { Prisma, type WebhookEventStatus as PrismaWebhookEventStatus } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type { Pagination, PaginatedResult } from "@/src/domain/shared";
import type {
  RecordWebhookEventInput,
  WebhookEvent,
  WebhookEventRepository,
  WebhookEventStatus,
} from "@/src/domain/payments";

type WebhookEventRow = Prisma.WebhookEventGetPayload<Record<string, never>>;

function toWebhookEvent(row: WebhookEventRow): WebhookEvent {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.providerEventId,
    gateway: row.gateway,
    accountNumber: row.accountNumber,
    subAccount: row.subAccount,
    amountIn: Number(row.amountIn),
    accumulated: row.accumulated === null ? null : Number(row.accumulated),
    code: row.code,
    content: row.content,
    transferType: row.transferType === "credit" || row.transferType === "debit" ? row.transferType : null,
    referenceNumber: row.referenceNumber,
    referenceCode: row.referenceCode,
    description: row.description,
    transactionDate: row.transactionDate,
    status: row.status as WebhookEventStatus,
    failureReason: row.failureReason,
    orderId: row.orderId,
    orderCode: row.orderCode,
    rawPayload: (row.rawPayload as Record<string, unknown>) ?? {},
    receivedAt: row.receivedAt,
    processedAt: row.processedAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

export const prismaWebhookEventRepository: WebhookEventRepository = {
  /**
   * Ghi nhật ký thô. Nếu event đã tồn tại (SePay retry theo dãy Fibonacci) thì
   * trả về bản ghi cũ với `duplicate: true` và KHÔNG ghi đè — đây là lớp chống
   * trùng đầu tiên, lớp thứ hai là UNIQUE(providerTransactionId) ở
   * bảng `payment_transactions`.
   */
  async record(input: RecordWebhookEventInput) {
    try {
      const row = await prisma.webhookEvent.create({
        data: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          gateway: input.gateway,
          accountNumber: input.accountNumber,
          subAccount: input.subAccount,
          amountIn: input.amountIn,
          accumulated: input.accumulated,
          code: input.code,
          content: input.content,
          transferType: input.transferType,
          referenceNumber: input.referenceNumber,
          referenceCode: input.referenceCode,
          description: input.description,
          transactionDate: input.transactionDate,
          rawPayload: input.rawPayload as object,
        },
      });
      return { id: row.id, duplicate: false };
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isUniqueViolation) {
        throw error;
      }
      const existing = await prisma.webhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: input.provider,
            providerEventId: input.providerEventId,
          },
        },
      });
      if (!existing) {
        throw error;
      }
      return { id: existing.id, duplicate: true };
    }
  },

  async markResolved(id, outcome) {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status: outcome.status as PrismaWebhookEventStatus,
        orderId: outcome.orderId ?? null,
        orderCode: outcome.orderCode ?? null,
        failureReason: outcome.failureReason ?? null,
        processedAt: new Date(),
      },
    });
  },

  async findByProviderEventId(provider, providerEventId) {
    const row = await prisma.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
    });
    return row ? toWebhookEvent(row) : null;
  },

  async listForAdmin(filters, pagination) {
    const where: Prisma.WebhookEventWhereInput = filters.status
      ? { status: filters.status as PrismaWebhookEventStatus }
      : {};
    const [rows, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.webhookEvent.count({ where }),
    ]);
    return toPaginated(rows.map(toWebhookEvent), total, pagination);
  },

  async countByStatus() {
    const groups = await prisma.webhookEvent.groupBy({ by: ["status"], _count: true });
    const result: Record<WebhookEventStatus, number> = {
      RECEIVED: 0,
      MATCHED: 0,
      REJECTED: 0,
      FAILED: 0,
    };
    for (const group of groups) {
      result[group.status as WebhookEventStatus] = group._count;
    }
    return result;
  },
};
