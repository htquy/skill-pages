import { AppsController } from "@/src/server/controllers/apps.controller";

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  return AppsController.checkAccess(request, slug);
}

export async function OPTIONS() {
  return AppsController.handleOptions();
}
