import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const statusClass: Record<string, string> = {
  completed: "badge-success", sending: "badge-info", scheduled: "badge-warning",
  draft: "badge-neutral", paused: "badge-warning", error: "badge-danger",
};
const statusLabel: Record<string, string> = {
  completed: "Concluída", sending: "Enviando", scheduled: "Agendada",
  draft: "Rascunho", paused: "Pausada", error: "Erro",
};

export default function CampaignsPage() {
  const { companyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "" });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addCampaign = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("campaigns").insert({
        company_id: companyId,
        name: form.name,
        subject: form.subject,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada!");
      setOpen(false);
      setForm({ name: "", subject: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-description">Crie e gerencie suas campanhas de email</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Campanha</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addCampaign.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
              <div><Label>Assunto</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="mt-1" /></div>
              <Button type="submit" disabled={addCampaign.isPending} className="w-full">{addCampaign.isPending ? "Criando..." : "Criar Campanha"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            Nenhuma campanha criada ainda. Clique em "Nova Campanha" para começar.
          </div>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <span className={statusClass[c.status] || "badge-neutral"}>{statusLabel[c.status] || c.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">Assunto: {c.subject || "-"}</p>
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
