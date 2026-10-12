import { AppsController } from "@/src/server/controllers/apps.controller";

export async function POST(request: Request) {
  return AppsController.adminCreateApp(request);
}
