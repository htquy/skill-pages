import { OrderController } from "@/src/server/controllers/order.controller";

export async function POST(request: Request) {
  return OrderController.create(request);
}
