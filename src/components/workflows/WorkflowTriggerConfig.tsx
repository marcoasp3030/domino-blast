import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WorkflowTriggerConfigProps {
  triggerType: string;
  triggerConfig: any;
  onClose: () => void;
  onUpdate: (type: string, config: any) => void;
}

const triggerOptions = [
  { value: "contact_added_to_list", label: "Contato adicionado à lista" },
  { value: "tag_added", label: "Tag adicionada ao contato" },
  { value: "campaign_event", label: "Evento de campanha" },
  { value: "scheduled", label: "Data agendada" },
];

export function WorkflowTriggerConfig({ triggerType, triggerConfig, onClose, onUpdate }: WorkflowTriggerConfigProps) {
  const { companyId } = useAuth();
  const [type, setType] = useState(triggerType);
  const [config, setConfig] = useState<any>(triggerConfig || {});

  const { data: lists = [] } = useQuery({
    queryKey: ["lists-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("lists").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("id, name").eq("company_id", companyId!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(type, newConfig);
  };

  const changeType = (t: string) => {
    setType(t);
    setConfig({});
    onUpdate(t, {});
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Configurar Trigger</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Tipo de Trigger</Label>
            <Select value={type} onValueChange={changeType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {triggerOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {type === "contact_added_to_list" && (
            <div>
              <Label>Lista</Label>
              <Select value={config.list_id || ""} onValueChange={(v) => updateConfig("list_id", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma lista" /></SelectTrigger>
                <SelectContent>
                  {lists.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "tag_added" && (
            <div>
              <Label>Tag</Label>
              <Select value={config.tag_id || ""} onValueChange={(v) => updateConfig("tag_id", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma tag" /></SelectTrigger>
                <SelectContent>
                  {tags.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "campaign_event" && (
            <>
              <div>
                <Label>Campanha</Label>
                <Select value={config.campaign_id || ""} onValueChange={(v) => updateConfig("campaign_id", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evento</Label>
                <Select value={config.event_type || ""} onValueChange={(v) => updateConfig("event_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abriu</SelectItem>
                    <SelectItem value="click">Clicou</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                    <SelectItem value="unsubscribe">Descadastro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === "scheduled" && (
            <p className="text-sm text-muted-foreground">
              O workflow será executado na data/hora configurada para cada contato da lista selecionada.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
