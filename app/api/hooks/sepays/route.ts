import { PaymentController } from "@/src/server/controllers/payment.controller";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return PaymentController.handleSePayWebhook(request);
}
