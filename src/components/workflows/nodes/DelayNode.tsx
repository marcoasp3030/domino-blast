import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";

export function DelayNode({ data }: { data: any }) {
  const cfg = data.config || {};
  const unit = cfg.unit === "hours" ? "hora(s)" : "dia(s)";
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 min-w-[200px] shadow-sm hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950">
          <Clock className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Aguardar</p>
          <p className="text-xs font-medium">{cfg.value ? `${cfg.value} ${unit}` : "Configurar..."}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
