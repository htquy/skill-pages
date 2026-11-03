import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import { ValidationError } from "@/src/domain/errors";
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
  /** Facade sang module apps: chỉ hỏi slug có tồn tại, không join bảng apps. */
  apps: { exists(slug: string): Promise<boolean> };
}

export function createToolAdminCommands(deps: ToolAdminDeps) {
  async function assertLinkedApp(data: SaveToolData) {
    if (data.appSlug && !(await deps.apps.exists(data.appSlug))) {
      throw new ValidationError(`Ứng dụng '${data.appSlug}' không tồn tại`);
    }
  }

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

    listByAppSlugs(appSlugs: string[]) {
      return deps.tools.listByAppSlugs(appSlugs);
    },

    async create(admin: CurrentUser, data: SaveToolData): Promise<string> {
      await assertLinkedApp(data);
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
      await assertLinkedApp(data);
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
