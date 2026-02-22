import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, AlertCircle, Shield, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  validated: { icon: CheckCircle2, className: "text-success" },
  pending: { icon: Clock, className: "text-warning" },
  validating: { icon: Clock, className: "text-warning" },
  error: { icon: AlertCircle, className: "text-destructive" },
};

const statusLabels: Record<string, string> = {
  validated: "Validado", pending: "Pendente", validating: "Em validação", error: "Erro",
};
const overallClass: Record<string, string> = {
  validated: "badge-success", pending: "badge-neutral", validating: "badge-warning", error: "badge-danger",
};

function DnsStatus({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-4 w-4 ${config.className}`} />
      <span className="text-sm">{statusLabels[status] || status}</span>
    </div>
  );
}

export default function DomainsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["domains", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("domains").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: senders = [] } = useQuery({
    queryKey: ["senders", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("senders").select("*");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addDomain = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("domains").insert({ company_id: companyId, domain });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("Domínio adicionado!");
      setOpen(false);
      setDomain("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Domínios & Remetentes</h1>
          <p className="page-description">Configure seus domínios de envio e autenticação</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar Domínio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Domínio</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addDomain.mutate(); }} className="space-y-4">
              <div><Label>Domínio</Label><Input placeholder="empresa.com" value={domain} onChange={(e) => setDomain(e.target.value)} required className="mt-1" /></div>
              <Button type="submit" disabled={addDomain.isPending} className="w-full">{addDomain.isPending ? "Adicionando..." : "Adicionar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Nenhum domínio configurado. Adicione um domínio para começar a enviar emails.
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => {
            const domainSenders = senders.filter((s) => s.domain_id === d.id);
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Shield className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{d.domain}</h3>
                      <span className={overallClass[d.overall_status] || "badge-neutral"}>{statusLabels[d.overall_status] || d.overall_status}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2"><RefreshCw className="h-3 w-3" /> Verificar DNS</Button>
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 mb-4">
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">SPF</p><DnsStatus status={d.spf_status} /></div>
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">DKIM</p><DnsStatus status={d.dkim_status} /></div>
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">DMARC</p><DnsStatus status={d.dmarc_status} /></div>
                </div>
                {domainSenders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Remetentes configurados</p>
                    <div className="flex flex-wrap gap-2">
                      {domainSenders.map((s) => <span key={s.id} className="badge-info">{s.from_email}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
