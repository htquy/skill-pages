import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { accessCommands } from "@/src/infrastructure/composition";
import { prismaSkillRepository } from "@/src/infrastructure/repositories/prisma-skill-repository";
import { ForbiddenError, isAppError } from "@/src/domain/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const id = (await params).id;
    const skill = await prismaSkillRepository.findContentById(id);
    if (!skill) return Response.json({ error: "Skill not found" }, { status: 404 });
    const purchase = await prismaSkillRepository.findPurchaseInfoById(id);
    if (purchase?.accessType === "PAID" && !(await accessCommands.hasActiveAccess(user.id, id))) {
      throw new ForbiddenError("Purchase required to view this skill");
    }
    return Response.json(skill);
  } catch (error) {
    if (isAppError(error)) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Unable to load skill content" }, { status: 500 });
  }
}
