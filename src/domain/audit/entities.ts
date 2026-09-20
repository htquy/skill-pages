import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export const AuditAction = {
  LOGIN: "LOGIN",
  CHANGE_USER_ROLE: "CHANGE_USER_ROLE",
  BLOCK_USER: "BLOCK_USER",
  UNBLOCK_USER: "UNBLOCK_USER",
  CREATE_SKILL: "CREATE_SKILL",
  UPDATE_SKILL: "UPDATE_SKILL",
  PUBLISH_SKILL: "PUBLISH_SKILL",
  UNPUBLISH_SKILL: "UNPUBLISH_SKILL",
  DELETE_SKILL: "DELETE_SKILL",
  CREATE_ARTICLE: "CREATE_ARTICLE",
  UPDATE_ARTICLE: "UPDATE_ARTICLE",
  PUBLISH_ARTICLE: "PUBLISH_ARTICLE",
  UNPUBLISH_ARTICLE: "UNPUBLISH_ARTICLE",
  DELETE_ARTICLE: "DELETE_ARTICLE",
  UPDATE_RANKING: "UPDATE_RANKING",
  PUBLISH_RANKING: "PUBLISH_RANKING",
  DELETE_RANKING: "DELETE_RANKING",
  GRANT_SKILL_ACCESS: "GRANT_SKILL_ACCESS",
  REVOKE_SKILL_ACCESS: "REVOKE_SKILL_ACCESS",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_CANCELED: "ORDER_CANCELED",
  ORDER_PAID: "ORDER_PAID",
  ORDER_REFUNDED: "ORDER_REFUNDED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogRepository {
  record(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void>;
  listForAdmin(pagination: Pagination): Promise<PaginatedResult<AuditLogEntry>>;
}