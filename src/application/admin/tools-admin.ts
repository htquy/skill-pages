import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type {
  PaginatedResult,
  Pagination,
  SaveToolData,
  ToolAdminDetail,
  ToolAdminRepository,
  ToolAdminSummary,
} from "@/src/domain/tool";

export interface ToolAdminDeps {
  tools: ToolAdminRepository;
  audit: AuditLogRepository;
}

export function createToolAdminCommands(deps: ToolAdminDeps) {
  return {
    list(
      filters: { q?: string; status?: string; type?: string; billingType?: string },
      pagination: Pagination,
    ): Promise<PaginatedResult<ToolAdminSummary>> {
      return deps.tools.list(
        {
          q: filters.q,
          status: filters.status === "ALL" ? undefined : (filters.status as ToolAdminSummary["status"]),
          type: filters.type === "ALL" ? undefined : (filters.type as ToolAdminSummary["type"]),
          billingType:
            filters.billingType === "ALL"
              ? undefined
              : (filters.billingType as ToolAdminSummary["billingType"]),
        },
        pagination,
      );
    },

    getDetail(id: string): Promise<ToolAdminDetail | null> {
      return deps.tools.findById(id);
    },

    async create(admin: CurrentUser, data: SaveToolData): Promise<string> {
      const id = await deps.tools.create(data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.CREATE_TOOL,
        entityType: "Tool",
        entityId: id,
      });
      return id;
    },

    async update(admin: CurrentUser, id: string, data: SaveToolData): Promise<void> {
      await deps.tools.update(id, data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UPDATE_TOOL,
        entityType: "Tool",
        entityId: id,
      });
    },

    async remove(admin: CurrentUser, id: string): Promise<void> {
      await deps.tools.delete(id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.DELETE_TOOL,
        entityType: "Tool",
        entityId: id,
      });
    },

    async publish(admin: CurrentUser, id: string): Promise<void> {
      await deps.tools.setStatus(id, "PUBLISHED");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.PUBLISH_TOOL,
        entityType: "Tool",
        entityId: id,
      });
    },

    async unpublish(admin: CurrentUser, id: string): Promise<void> {
      await deps.tools.setStatus(id, "DRAFT");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UNPUBLISH_TOOL,
        entityType: "Tool",
        entityId: id,
      });
    },
  };
}
