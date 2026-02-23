import { Handle, Position } from "@xyflow/react";
import { Mail } from "lucide-react";

export function SendEmailNode({ data }: { data: any }) {
  const cfg = data.config || {};
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 min-w-[200px] shadow-sm hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950">
          <Mail className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enviar Email</p>
          <p className="text-xs font-medium truncate">{cfg.subject || "Configurar..."}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
