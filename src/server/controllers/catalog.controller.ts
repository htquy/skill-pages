import { NextResponse } from "next/server";
import { accessCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { prismaSkillRepository } from "@/src/infrastructure/repositories/prisma-skill-repository";
import { ForbiddenError, isAppError } from "@/src/domain/errors";

/**
 * CatalogController: các endpoint đọc nội dung catalog (kỹ năng, công cụ...).
 * Nội dung trả phí được kiểm tra quyền truy cập trước khi trả nội dung.
 */
export class CatalogController {
  /** GET /api/skills/[id]/content */
  static async getSkillContent(_request: Request, skillId: string): Promise<NextResponse> {
    try {
      const user = await requireUser();
      const skill = await prismaSkillRepository.findContentById(skillId);
      if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

      const purchase = await prismaSkillRepository.findPurchaseInfoById(skillId);
      if (purchase?.accessType === "PAID" && !(await accessCommands.hasActiveAccess(user.id, skillId))) {
        throw new ForbiddenError("Purchase required to view this skill");
      }

      return NextResponse.json(skill);
    } catch (error) {
      if (isAppError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Unable to load skill content" }, { status: 500 });
    }
  }
}
