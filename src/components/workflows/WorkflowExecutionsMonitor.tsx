import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, Clock, CheckCircle, XCircle, Play, AlertTriangle, StopCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Props {
  workflowId: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  running: <Play className="h-3.5 w-3.5 text-primary" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

const statusLabel: Record<string, string> = {
  running: "Em execução",
  completed: "Concluída",
  failed: "Falhou",
  pending: "Pendente",
};

const stepTypeLabels: Record<string, string> = {
  send_email: "Enviar Email",
  delay: "Aguardar",
  condition: "Condição",
  add_tag: "Adicionar Tag",
  remove_tag: "Remover Tag",
};

export function WorkflowExecutionsMonitor({ workflowId }: Props) {
  const queryClient = useQueryClient();

  // Fetch executions with contact info
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["workflow-executions", workflowId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_executions")
        .select("*, contacts(name, email), workflow_execution_steps(id, step_id, status, executed_at, scheduled_at)")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Fetch steps for mapping
  const { data: steps = [] } = useQuery({
    queryKey: ["workflow-steps", workflowId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("id, step_type, config")
        .eq("workflow_id", workflowId);
      return data || [];
    },
  });

  // Cancel execution
  const cancelExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from("workflow_executions")
        .update({ status: "failed", error_message: "Cancelado manualmente", completed_at: new Date().toISOString() })
        .eq("id", executionId);
      if (error) throw error;
      // Also mark pending steps as failed
      await supabase
        .from("workflow_execution_steps")
        .update({ status: "skipped" })
        .eq("execution_id", executionId)
        .eq("status", "pending");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions", workflowId] });
      toast.success("Execução cancelada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stepsMap = Object.fromEntries(steps.map((s: any) => [s.id, s]));
  const totalSteps = steps.length;

  // Stats
  const running = executions.filter((e: any) => e.status === "running").length;
  const completed = executions.filter((e: any) => e.status === "completed").length;
  const failed = executions.filter((e: any) => e.status === "failed").length;
  const total = executions.length;

  // Contacts per step (for running executions)
  const stepCounts: Record<string, number> = {};
  executions
    .filter((e: any) => e.status === "running" && e.current_step_id)
    .forEach((e: any) => {
      stepCounts[e.current_step_id] = (stepCounts[e.current_step_id] || 0) + 1;
    });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando execuções...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total" value={total} />
        <StatCard icon={<Play className="h-4 w-4 text-primary" />} label="Em execução" value={running} />
        <StatCard icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} label="Concluídas" value={completed} />
        <StatCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Falharam" value={failed} />
      </div>

      {/* Contacts per Step */}
      {steps.length > 0 && running > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Contatos por Step (em execução)</h3>
          <div className="space-y-2">
            {steps.map((step: any) => {
              const count = stepCounts[step.id] || 0;
              const pct = running > 0 ? (count / running) * 100 : 0;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate">
                    {stepTypeLabels[step.step_type] || step.step_type}
                  </span>
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Executions Table */}
      {total === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma execução registrada ainda.</p>
          <p className="text-xs mt-1">Ative a automação e aguarde os triggers serem disparados.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Step Atual</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Iniciado em</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec: any) => {
                const contact = exec.contacts;
                const completedSteps = exec.workflow_execution_steps?.filter((s: any) => s.status === "completed").length || 0;
                const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const currentStep = exec.current_step_id ? stepsMap[exec.current_step_id] : null;

                return (
                  <TableRow key={exec.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{contact?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{contact?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcon[exec.status] || statusIcon.pending}
                        <span className="text-xs">{statusLabel[exec.status] || exec.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {exec.status === "running" && currentStep ? (
                        <Badge variant="secondary" className="text-xs">
                          {stepTypeLabels[currentStep.step_type] || currentStep.step_type}
                        </Badge>
                      ) : exec.status === "completed" ? (
                        <span className="text-xs text-muted-foreground">Finalizado</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={progressPct} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{completedSteps}/{totalSteps}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(exec.started_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {exec.status === "running" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Cancelar execução"
                          onClick={() => {
                            if (confirm("Cancelar esta execução?")) cancelExecution.mutate(exec.id);
                          }}
                          disabled={cancelExecution.isPending}
                        >
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
