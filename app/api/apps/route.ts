import { AppsController } from "@/src/server/controllers/apps.controller";

export async function GET() {
  return AppsController.listApps();
}

export async function OPTIONS() {
  return AppsController.handleOptions();
}
