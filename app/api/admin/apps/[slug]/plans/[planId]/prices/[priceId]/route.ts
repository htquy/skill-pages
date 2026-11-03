import { AppsController } from "@/src/server/controllers/apps.controller";

export async function DELETE(_request: Request, props: { params: Promise<{ slug: string; planId: string; priceId: string }> }) {
  const { slug, planId, priceId } = await props.params;
  return AppsController.adminDeletePlanPrice(slug, planId, priceId);
}
