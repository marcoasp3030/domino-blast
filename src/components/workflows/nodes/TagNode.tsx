import { Handle, Position } from "@xyflow/react";
import { Tag } from "lucide-react";

export function TagNode({ data }: { data: any }) {
  const cfg = data.config || {};
  const isRemove = data.stepType === "remove_tag";
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 min-w-[200px] shadow-sm hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${isRemove ? "bg-red-100 dark:bg-red-950" : "bg-emerald-100 dark:bg-emerald-950"}`}>
          <Tag className={`h-4 w-4 ${isRemove ? "text-red-600" : "text-emerald-600"}`} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isRemove ? "Remover Tag" : "Adicionar Tag"}
          </p>
          <p className="text-xs font-medium">{cfg.tag_name || "Configurar..."}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
