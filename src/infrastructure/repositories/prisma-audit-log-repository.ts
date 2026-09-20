import { prisma } from "@/src/infrastructure/database/prisma";
import type { AuditLogEntry, AuditLogRepository } from "@/src/domain/audit";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

function toEntry(row: {
  id: string;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}): AuditLogEntry {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}

function toPaginated<T>(items: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize, totalPages };
}

export const prismaAuditLogRepository: AuditLogRepository = {
  async record(input) {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as object | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  },

  async listForAdmin(pagination) {
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.auditLog.count(),
    ]);
    const items = rows.map((row) =>
      toEntry({
        id: row.id,
        actorUserId: row.actorUserId,
        actorName: row.actor.name,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      }),
    );
    return toPaginated(items, total, pagination);
  },
};