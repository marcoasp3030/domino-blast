import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Clock, GitBranch, Tag, TagIcon } from "lucide-react";

interface AddStepMenuProps {
  open: boolean;
  onClose: () => void;
  onAdd: (stepType: string) => void;
}

const stepTypes = [
  { type: "send_email", label: "Enviar Email", description: "Envia um email usando um template", icon: Mail, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950" },
  { type: "delay", label: "Aguardar", description: "Espera um período de tempo antes de continuar", icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950" },
  { type: "condition", label: "Condição", description: "Divide o fluxo com base em uma condição", icon: GitBranch, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-950" },
  { type: "add_tag", label: "Adicionar Tag", description: "Adiciona uma tag ao contato", icon: Tag, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950" },
  { type: "remove_tag", label: "Remover Tag", description: "Remove uma tag do contato", icon: TagIcon, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950" },
];

export function AddStepMenu({ open, onClose, onAdd }: AddStepMenuProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Step</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {stepTypes.map((st) => (
            <button
              key={st.type}
              onClick={() => onAdd(st.type)}
              className="flex items-center gap-3 w-full rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${st.bg}`}>
                <st.icon className={`h-5 w-5 ${st.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{st.label}</p>
                <p className="text-xs text-muted-foreground">{st.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
