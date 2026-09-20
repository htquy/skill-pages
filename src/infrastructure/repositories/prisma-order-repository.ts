import { Prisma, type OrderStatus as PrismaOrderStatus } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  CreateOrderCommand,
  Order,
  OrderStatus,
  OrderRepository,
} from "@/src/domain/orders";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

type OrderRow = Prisma.OrderGetPayload<{ include: { skill: { select: { title: true; slug: true } } } }>;

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderCode: row.orderCode,
    userId: row.userId,
    skillId: row.skillId,
    skillTitle: row.skill.title,
    skillSlug: row.skill.slug,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status as OrderStatus,
    expiresAt: row.expiresAt,
    paidAt: row.paidAt,
    canceledAt: row.canceledAt,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const selectInclude = {
  skill: { select: { title: true, slug: true } },
} as const;

function orderCode(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${yyyy}${mm}${dd}-${suffix}`;
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

export const prismaOrderRepository: OrderRepository = {
  async create(data: CreateOrderCommand) {
    const expiresAt = new Date(Date.now() + (data.expiresInMinutes ?? 15) * 60 * 1000);
    const row = await prisma.order.create({
      data: {
        orderCode: orderCode(),
        userId: data.userId,
        skillId: data.skillId,
        amount: data.amount,
        currency: data.currency,
        status: "PENDING",
        expiresAt,
      },
      include: selectInclude,
    });
    return toOrder(row);
  },

  async findById(id) {
    const row = await prisma.order.findUnique({ where: { id }, include: selectInclude });
    return row ? toOrder(row) : null;
  },

  async findByOrderCode(orderCode) {
    const row = await prisma.order.findUnique({ where: { orderCode }, include: selectInclude });
    return row ? toOrder(row) : null;
  },

  async findValidPending(userId, skillId) {
    const row = await prisma.order.findFirst({
      where: {
        userId,
        skillId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: selectInclude,
      orderBy: { createdAt: "desc" },
    });
    return row ? toOrder(row) : null;
  },

  async listByUser(userId) {
    const rows = await prisma.order.findMany({
      where: { userId },
      include: selectInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOrder);
  },

  async listPendingExpired(before) {
    const rows = await prisma.order.findMany({
      where: { status: "PENDING", expiresAt: { lt: before } },
      include: selectInclude,
    });
    return rows.map(toOrder);
  },

  async updateStatus(id, status, extra) {
    const row = await prisma.order.update({
      where: { id },
      data: { status, paidAt: extra?.paidAt, canceledAt: extra?.canceledAt, refundedAt: extra?.refundedAt },
      include: selectInclude,
    });
    return toOrder(row);
  },

  async listForAdmin(filter, pagination) {
    const where: Prisma.OrderWhereInput = {};
    if (filter.q) {
      where.OR = [
        { orderCode: { contains: filter.q, mode: "insensitive" } },
        { user: { email: { contains: filter.q, mode: "insensitive" } } },
        { skill: { title: { contains: filter.q, mode: "insensitive" } } },
      ];
    }
    if (filter.status) where.status = filter.status as PrismaOrderStatus;

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: selectInclude,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return toPaginated(rows.map(toOrder), total, pagination);
  },

  async countByStatus() {
    const groups = await prisma.order.groupBy({ by: ["status"], _count: true });
    const result: Record<OrderStatus, number> = {
      PENDING: 0,
      PAID: 0,
      EXPIRED: 0,
      CANCELED: 0,
      FAILED: 0,
      REFUNDED: 0,
    };
    for (const group of groups) {
      result[group.status as OrderStatus] = group._count;
    }
    return result;
  },

  async sumRevenue() {
    const agg = await prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  },

  async listRevenueByMonth(months) {
    const rows = await prisma.order.findMany({
      where: { status: "PAID", paidAt: { not: null } },
      select: { amount: true, paidAt: true },
    });
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
    }
    for (const row of rows) {
      const d = row.paidAt as Date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + Number(row.amount));
    }
    return Array.from(buckets.entries()).map(([month, total]) => ({ month, total }));
  },

  async listSalesBySkill(limit) {
    const groups = await prisma.order.groupBy({
      by: ["skillId"],
      where: { status: "PAID" },
      _count: true,
      _sum: { amount: true },
      orderBy: { _count: { skillId: "desc" } },
      take: limit,
    });
    const skills = await prisma.skill.findMany({
      where: { id: { in: groups.map((g) => g.skillId) } },
      select: { id: true, title: true, slug: true },
    });
    const byId = new Map(skills.map((s) => [s.id, s]));
    return groups.flatMap((g) => {
      const skill = byId.get(g.skillId);
      return skill
        ? [
            {
              skillId: g.skillId,
              title: skill.title,
              slug: skill.slug,
              orders: g._count,
              revenue: Number(g._sum.amount ?? 0),
            },
          ]
        : [];
    });
  },

  async listRecent(limit) {
    const rows = await prisma.order.findMany({
      include: selectInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toOrder);
  },

  async sumViewsAndFavorites() {
    const agg = await prisma.skill.aggregate({
      _sum: { viewCount: true, favoriteCount: true },
    });
    return {
      views: Number(agg._sum.viewCount ?? 0),
      favorites: Number(agg._sum.favoriteCount ?? 0),
    };
  },
};