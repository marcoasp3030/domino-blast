import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Node } from "@xyflow/react";

interface WorkflowStepConfigProps {
  node: Node;
  onClose: () => void;
  onUpdate: (config: any) => void;
  onDelete: () => void;
}

export function WorkflowStepConfig({ node, onClose, onUpdate, onDelete }: WorkflowStepConfigProps) {
  const { companyId } = useAuth();
  const [config, setConfig] = useState<any>(node.data?.config || {});

  useEffect(() => {
    setConfig(node.data?.config || {});
  }, [node.id]);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && (node.type === "send_email"),
  });

  const { data: senders = [] } = useQuery({
    queryKey: ["senders-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("senders").select("id, from_name, from_email").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && (node.type === "send_email"),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && (node.type === "add_tag" || node.type === "remove_tag"),
  });

  const update = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(newConfig);
  };

  const stepLabels: Record<string, string> = {
    send_email: "Enviar Email",
    delay: "Aguardar",
    condition: "Condição",
    add_tag: "Adicionar Tag",
    remove_tag: "Remover Tag",
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>{stepLabels[node.type!] || "Configuração"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {node.type === "send_email" && (
            <>
              <div>
                <Label>Assunto *</Label>
                <Input value={config.subject || ""} onChange={(e) => update("subject", e.target.value)} placeholder="Assunto do email" className="mt-1" />
              </div>
              <div>
                <Label>Template</Label>
                <Select value={config.template_id || ""} onValueChange={(v) => update("template_id", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remetente</Label>
                <Select value={config.sender_id || ""} onValueChange={(v) => update("sender_id", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um remetente" /></SelectTrigger>
                  <SelectContent>
                    {senders.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.from_name} ({s.from_email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {node.type === "delay" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Duração</Label>
                <Input type="number" min={1} value={config.value || ""} onChange={(e) => update("value", parseInt(e.target.value) || "")} placeholder="Ex: 2" className="mt-1" />
              </div>
              <div className="flex-1">
                <Label>Unidade</Label>
                <Select value={config.unit || "days"} onValueChange={(v) => update("unit", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {node.type === "condition" && (
            <>
              <div>
                <Label>Condição</Label>
                <Select value={config.condition || ""} onValueChange={(v) => update("condition", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma condição" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opened_email">Abriu o email anterior</SelectItem>
                    <SelectItem value="clicked_email">Clicou no email anterior</SelectItem>
                    <SelectItem value="has_tag">Possui uma tag</SelectItem>
                    <SelectItem value="not_opened">Não abriu o email anterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.condition === "has_tag" && (
                <div>
                  <Label>Tag</Label>
                  <Select value={config.tag_id || ""} onValueChange={(v) => {
                    const tag = tags.find((t: any) => t.id === v);
                    update("tag_id", v);
                    if (tag) update("tag_name", (tag as any).name);
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma tag" /></SelectTrigger>
                    <SelectContent>
                      {tags.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {(node.type === "add_tag" || node.type === "remove_tag") && (
            <div>
              <Label>Tag</Label>
              <Select value={config.tag_id || ""} onValueChange={(v) => {
                const tag = tags.find((t: any) => t.id === v);
                update("tag_id", v);
                if (tag) update("tag_name", (tag as any).name);
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma tag" /></SelectTrigger>
                <SelectContent>
                  {tags.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir Step
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
