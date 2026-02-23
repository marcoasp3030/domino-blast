import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Send, Loader2, Pencil, RotateCcw, BarChart3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CampaignWizardDialog } from "@/components/campaigns/CampaignWizardDialog";
import { CampaignRecipientsDialog } from "@/components/campaigns/CampaignRecipientsDialog";
import { CampaignProgress } from "@/components/campaigns/CampaignProgress";

const statusClass: Record<string, string> = {
  completed: "badge-success", sending: "badge-info", scheduled: "badge-warning",
  draft: "badge-neutral", paused: "badge-warning", error: "badge-danger",
};
const statusLabel: Record<string, string> = {
  completed: "Concluída", sending: "Enviando", scheduled: "Agendada",
  draft: "Rascunho", paused: "Pausada", error: "Erro",
};

export default function CampaignsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [recipientsCampaign, setRecipientsCampaign] = useState<{ id: string; name: string } | null>(null);

  // Realtime: auto-refresh when campaign status changes
  useEffect(() => {
    const channel = supabase
      .channel("campaigns-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*, lists(name), senders(from_name, from_email), email_templates(name)").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendCampaign = async (campaignId: string) => {
    if (!confirm("Tem certeza que deseja enviar esta campanha agora? Os emails serão enviados via SendGrid.")) return;
    setSendingId(campaignId);
    try {
      // Reset status to draft before sending (needed for resend of error/completed campaigns)
      await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaignId);

      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Campanha enviada! ${data.sent} emails enviados, ${data.failed} falharam.`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar campanha");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-description">Crie e gerencie suas campanhas de email</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditingCampaign(null); setWizardOpen(true); }}><Plus className="h-4 w-4" /> Nova Campanha</Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            Nenhuma campanha criada ainda. Clique em "Nova Campanha" para começar.
          </div>
        ) : (
          campaigns.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <span className={statusClass[c.status] || "badge-neutral"}>{statusLabel[c.status] || c.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">Assunto: {c.subject || "-"}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                    {c.lists?.name && <span>Lista: {c.lists.name}</span>}
                    {c.email_templates?.name && <span>• Template: {c.email_templates.name}</span>}
                    {c.senders?.from_email && <span>• De: {c.senders.from_email}</span>}
                    {c.scheduled_at && <span>• Agendada: {new Date(c.scheduled_at).toLocaleString("pt-BR")}</span>}
                  </div>
                </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Destinatários</p>
                      <p className="font-semibold">{c.total_recipients || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Data</p>
                      <p className="font-semibold">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {(c.status === "completed" || c.status === "sending") && (
                      <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => setRecipientsCampaign({ id: c.id, name: c.name })}>
                        <BarChart3 className="h-3.5 w-3.5" /> Ver Atividade
                      </Button>
                    )}
                  {(c.status === "draft" || c.status === "error") && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => { setEditingCampaign(c); setWizardOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="default" className="gap-1.5 h-8" onClick={() => sendCampaign(c.id)} disabled={sendingId === c.id}>
                        {sendingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.status === "error" ? <RotateCcw className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                        {sendingId === c.id ? "Enviando..." : c.status === "error" ? "Reenviar" : "Enviar"}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => { if (confirm("Excluir esta campanha?")) deleteCampaign.mutate(c.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {c.status === "completed" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => { setEditingCampaign(c); setWizardOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1.5 h-8" onClick={() => sendCampaign(c.id)} disabled={sendingId === c.id}>
                        {sendingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        {sendingId === c.id ? "Enviando..." : "Reenviar"}
                      </Button>
                    </div>
                  )}
                  {c.status === "scheduled" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => { setEditingCampaign(c); setWizardOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                  )}
                  {c.status === "sending" && (
                    <div className="min-w-[200px]">
                      <CampaignProgress campaignId={c.id} totalRecipients={c.total_recipients || 0} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CampaignWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} editCampaign={editingCampaign} />
      <CampaignRecipientsDialog open={!!recipientsCampaign} onOpenChange={(o) => !o && setRecipientsCampaign(null)} campaign={recipientsCampaign} />
    </AppLayout>
  );
}
