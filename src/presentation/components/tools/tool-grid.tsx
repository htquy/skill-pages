import type { ToolCardViewModel } from "@/src/presentation/view-models/tool";
import { ToolCard } from "@/src/presentation/components/tools/tool-card";

export function ToolGrid({ tools }: { tools: ToolCardViewModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.slug} tool={tool} />
      ))}
    </div>
  );
}
