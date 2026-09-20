import { Container } from "@/src/presentation/components/layout/container";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { skillAdminCommands } from "@/src/infrastructure/composition";
export const dynamic = "force-dynamic";
export default async function AdminSkillsPage() { await requireAdmin(); const result = await skillAdminCommands.list({}, { page: 1, pageSize: 50 }); return <Container className="py-10"><h1 className="text-3xl font-bold">Skills</h1><div className="mt-6 space-y-2">{result.items.map((skill) => <div key={skill.id} className="rounded-xl border bg-white p-4"><span className="font-medium">{skill.title}</span><span className="ml-3 text-sm text-zinc-500">{skill.status} · {skill.accessType}</span></div>)}</div></Container>; }
