import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type { AdminUserView, UserRecord, UserRepository } from "@/src/domain/identity/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toRecord(row: {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role as UserRecord["role"],
    status: row.status as UserRecord["status"],
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

type AdminRow = Prisma.UserGetPayload<{
  include: { _count: { select: { orders: true; skillAccess: true } }; orders: { select: { amount: true; status: true } } };
}>;

function toAdminView(row: AdminRow): AdminUserView {
  const paid = row.orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.amount), 0);
  return {
    ...toRecord(row),
    orderCount: row._count.orders,
    paidAmount: paid,
    accessCount: row._count.skillAccess,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

export const prismaUserRepository: UserRepository = {
  async findById(id) {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  },

  async findByEmail(email) {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toRecord(row) : null;
  },

  async updateLastLoginAt(id, at) {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: at } });
  },

  async listForAdmin(filters, pagination) {
    const where: Prisma.UserWhereInput = {};
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { id: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: { select: { orders: true, skillAccess: true } },
          orders: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return toPaginated(rows.map(toAdminView), total, pagination);
  },

  async setRole(id, role) {
    await prisma.user.update({ where: { id }, data: { role } });
  },

  async setStatus(id, status) {
    await prisma.user.update({ where: { id }, data: { status } });
  },

  async countTotal() {
    return prisma.user.count();
  },

  async countActive() {
    return prisma.user.count({ where: { status: "ACTIVE" } });
  },

  async countByRole(role) {
    return prisma.user.count({ where: { role } });
  },

  async countByStatus(status) {
    return prisma.user.count({ where: { status } });
  },
};
