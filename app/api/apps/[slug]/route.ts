import { AppsController } from "@/src/server/controllers/apps.controller";

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  return AppsController.getApp(slug);
}

export async function OPTIONS() {
  return AppsController.handleOptions();
}
