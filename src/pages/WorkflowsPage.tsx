import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Play, Pause, Trash2, Pencil, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { workflowTemplates, type WorkflowTemplate } from "@/components/workflows/workflowTemplates";

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: "Rascunho", class: "badge-neutral" },
  active: { label: "Ativa", class: "badge-success" },
  paused: { label: "Pausada", class: "badge-warning" },
  archived: { label: "Arquivada", class: "badge-neutral" },
};

const triggerLabels: Record<string, string> = {
  contact_added_to_list: "Contato adicionado à lista",
  tag_added: "Tag adicionada",
  campaign_event: "Evento de campanha",
  scheduled: "Data agendada",
};

export default function WorkflowsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflows")
        .select("*, workflow_steps(id), workflow_executions(id, status)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createWorkflow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .insert({ company_id: companyId!, name: "Nova Automação" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      navigate(`/workflows/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Duplicate workflow
  const duplicateWorkflow = useMutation({
    mutationFn: async (workflowId: string) => {
      // Fetch workflow
      const { data: src } = await supabase.from("workflows").select("*").eq("id", workflowId).single();
      if (!src) throw new Error("Workflow não encontrado");

      // Create copy
      const { data: newWf, error: wfErr } = await supabase
        .from("workflows")
        .insert({
          company_id: companyId!,
          name: `${src.name} (cópia)`,
          trigger_type: src.trigger_type,
          trigger_config: src.trigger_config,
          description: src.description,
          status: "draft",
        })
        .select("id")
        .single();
      if (wfErr) throw wfErr;

      // Copy steps
      const { data: srcSteps } = await supabase.from("workflow_steps").select("*").eq("workflow_id", workflowId);
      const idMap: Record<string, string> = {};
      if (srcSteps && srcSteps.length > 0) {
        const newSteps = srcSteps.map((s) => {
          const newId = crypto.randomUUID();
          idMap[s.id] = newId;
          return { id: newId, workflow_id: newWf!.id, step_type: s.step_type, config: s.config, position_x: s.position_x, position_y: s.position_y };
        });
        await supabase.from("workflow_steps").insert(newSteps);
      }

      // Copy edges
      const { data: srcEdges } = await supabase.from("workflow_edges").select("*").eq("workflow_id", workflowId);
      if (srcEdges && srcEdges.length > 0) {
        const newEdges = srcEdges.map((e) => ({
          workflow_id: newWf!.id,
          source_step_id: e.source_step_id === "trigger" ? "trigger" : (idMap[e.source_step_id] || e.source_step_id),
          target_step_id: idMap[e.target_step_id] || e.target_step_id,
          source_handle: e.source_handle,
        }));
        await supabase.from("workflow_edges").insert(newEdges);
      }

      return newWf!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Automação duplicada!");
      navigate(`/workflows/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Create from template
  const createFromTemplate = useMutation({
    mutationFn: async (template: WorkflowTemplate) => {
      const { data: newWf, error: wfErr } = await supabase
        .from("workflows")
        .insert({
          company_id: companyId!,
          name: template.name,
          trigger_type: template.triggerType,
          trigger_config: template.triggerConfig,
          description: template.description,
          status: "draft",
        })
        .select("id")
        .single();
      if (wfErr) throw wfErr;

      // Map template step IDs to real UUIDs
      const idMap: Record<string, string> = {};
      const stepsToInsert = template.steps.map((s) => {
        const newId = crypto.randomUUID();
        idMap[s.id] = newId;
        return { id: newId, workflow_id: newWf!.id, step_type: s.stepType, config: s.config, position_x: s.positionX, position_y: s.positionY };
      });
      if (stepsToInsert.length > 0) {
        await supabase.from("workflow_steps").insert(stepsToInsert);
      }

      const edgesToInsert = template.edges.map((e) => ({
        workflow_id: newWf!.id,
        source_step_id: e.sourceId === "trigger" ? "trigger" : (idMap[e.sourceId] || e.sourceId),
        target_step_id: idMap[e.targetId] || e.targetId,
        source_handle: e.sourceHandle,
      }));
      if (edgesToInsert.length > 0) {
        await supabase.from("workflow_edges").insert(edgesToInsert);
      }

      return newWf!;
    },
    onSuccess: (data) => {
      setShowTemplates(false);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Automação criada a partir do template!");
      navigate(`/workflows/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Automação excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase.from("workflows").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(newStatus === "active" ? "Automação ativada!" : "Automação pausada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Automações</h1>
          <p className="page-description">Crie sequências automáticas de emails com triggers, delays e condições</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowTemplates(true)}>
            <Zap className="h-4 w-4" /> Templates
          </Button>
          <Button size="sm" className="gap-2" onClick={() => createWorkflow.mutate()} disabled={createWorkflow.isPending}>
            <Plus className="h-4 w-4" /> Nova Automação
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : workflows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma automação criada ainda.</p>
            <p className="text-sm mt-1">Clique em "Nova Automação" ou escolha um template para começar.</p>
          </div>
        ) : (
          workflows.map((w: any) => {
            const stepsCount = w.workflow_steps?.length || 0;
            const runningCount = w.workflow_executions?.filter((e: any) => e.status === "running").length || 0;
            const totalExecutions = w.workflow_executions?.length || 0;
            const cfg = statusConfig[w.status] || statusConfig.draft;

            return (
              <div key={w.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{w.name}</h3>
                      <span className={cfg.class}>{cfg.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span>Trigger: {triggerLabels[w.trigger_type] || w.trigger_type}</span>
                      <span>• {stepsCount} step{stepsCount !== 1 ? "s" : ""}</span>
                      {totalExecutions > 0 && <span>• {totalExecutions} execuções ({runningCount} ativas)</span>}
                      <span>• Criada em {new Date(w.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => navigate(`/workflows/${w.id}`)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8"
                      onClick={() => duplicateWorkflow.mutate(w.id)}
                      disabled={duplicateWorkflow.isPending}
                      title="Duplicar automação"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </Button>
                    {(w.status === "active" || w.status === "paused") && (
                      <Button
                        size="sm"
                        variant={w.status === "active" ? "secondary" : "default"}
                        className="gap-1.5 h-8"
                        onClick={() => toggleStatus.mutate({ id: w.id, status: w.status })}
                      >
                        {w.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {w.status === "active" ? "Pausar" : "Ativar"}
                      </Button>
                    )}
                    {w.status === "draft" && (
                      <Button size="sm" variant="default" className="gap-1.5 h-8" onClick={() => toggleStatus.mutate({ id: w.id, status: w.status })}>
                        <Play className="h-3.5 w-3.5" /> Ativar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => { if (confirm("Excluir esta automação?")) deleteWorkflow.mutate(w.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Templates de Automação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            {workflowTemplates.map((t) => (
              <button
                key={t.id}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                onClick={() => createFromTemplate.mutate(t)}
                disabled={createFromTemplate.isPending}
              >
                <span className="text-2xl shrink-0">{t.icon}</span>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">{t.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {t.steps.length} steps
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {triggerLabels[t.triggerType] || t.triggerType}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
