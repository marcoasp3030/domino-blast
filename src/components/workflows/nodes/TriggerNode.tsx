import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";

const triggerLabels: Record<string, string> = {
  contact_added_to_list: "Contato adicionado à lista",
  tag_added: "Tag adicionada",
  campaign_event: "Evento de campanha",
  scheduled: "Data agendada",
};

export function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-primary/10 border-2 border-primary rounded-xl px-4 py-3 min-w-[200px] shadow-md">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/20">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Trigger</p>
          <p className="text-xs font-medium text-foreground">{triggerLabels[data.triggerType] || "Selecione"}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
