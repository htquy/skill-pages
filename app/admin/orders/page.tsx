import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { orderRepository } from "@/src/infrastructure/composition";
export const dynamic = "force-dynamic";
export default async function AdminOrdersPage() { await requireAdmin(); const result = await orderRepository.listForAdmin({}, { page: 1, pageSize: 50 }); return <Container className="py-10"><h1 className="text-3xl font-bold">Orders</h1><div className="mt-6 space-y-2">{result.items.map((order) => <div key={order.id} className="rounded-xl border bg-white p-4"><span className="font-medium">{order.orderCode}</span><span className="ml-3 text-sm text-zinc-500">{order.status} · {order.amount.toLocaleString()} {order.currency}</span></div>)}</div></Container>; }
