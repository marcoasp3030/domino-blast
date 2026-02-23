import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";

const conditionLabels: Record<string, string> = {
  opened_email: "Abriu o email",
  clicked_email: "Clicou no email",
  has_tag: "Possui tag",
  not_opened: "Não abriu",
};

export function ConditionNode({ data }: { data: any }) {
  const cfg = data.config || {};
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 min-w-[220px] shadow-sm hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950">
          <GitBranch className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Condição</p>
          <p className="text-xs font-medium">{conditionLabels[cfg.condition] || "Configurar..."}</p>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-medium px-1">
        <span className="text-emerald-600">✓ Sim</span>
        <span className="text-red-500">✗ Não</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
