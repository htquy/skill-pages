import { AppsController } from "@/src/server/controllers/apps.controller";

export async function DELETE(_request: Request, props: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await props.params;
  return AppsController.adminDeletePlan(slug, planId);
}

export async function PATCH(request: Request, props: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await props.params;
  return AppsController.adminUpdatePlan(request, slug, planId);
}
