import { AppsController } from "@/src/server/controllers/apps.controller";

export async function PATCH(request: Request, props: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await props.params;
  return AppsController.adminUpdatePlan(request, slug, planId);
}
