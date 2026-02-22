import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, AlertCircle, Shield, RefreshCw, Trash2, Copy } from "lucide-react";
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

function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  const copyValue = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  };
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 bg-muted/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="badge-info text-[10px]">{type}</span>
          <span className="text-xs font-medium text-foreground">{name}</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono break-all">{value}</p>
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={copyValue}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DnsRecordsSection({ domain }: { domain: string }) {
  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Registros DNS necessários</p>
      <DnsRecord type="TXT" name={domain} value={`v=spf1 include:sendgrid.net ~all`} />
      <DnsRecord type="CNAME" name={`s1._domainkey.${domain}`} value={`s1.domainkey.u${Math.random().toString(36).substring(2, 8)}.wl.sendgrid.net`} />
      <DnsRecord type="CNAME" name={`s2._domainkey.${domain}`} value={`s2.domainkey.u${Math.random().toString(36).substring(2, 8)}.wl.sendgrid.net`} />
      <DnsRecord type="TXT" name={`_dmarc.${domain}`} value={`v=DMARC1; p=none; rua=mailto:dmarc@${domain}`} />
    </div>
  );
}

export default function DomainsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [senderForm, setSenderForm] = useState({ from_name: "", from_email: "", reply_to: "", domain_id: "" });
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

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

  const addSender = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("senders").insert({
        company_id: companyId,
        from_name: senderForm.from_name,
        from_email: senderForm.from_email,
        reply_to: senderForm.reply_to || null,
        domain_id: senderForm.domain_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      toast.success("Remetente adicionado!");
      setSenderOpen(false);
      setSenderForm({ from_name: "", from_email: "", reply_to: "", domain_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("Domínio removido!");
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
        <div className="flex gap-2">
          <Dialog open={senderOpen} onOpenChange={setSenderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Remetente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Remetente</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addSender.mutate(); }} className="space-y-4">
                <div><Label>Nome</Label><Input value={senderForm.from_name} onChange={(e) => setSenderForm({ ...senderForm, from_name: e.target.value })} placeholder="Minha Empresa" required className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={senderForm.from_email} onChange={(e) => setSenderForm({ ...senderForm, from_email: e.target.value })} placeholder="contato@empresa.com" required className="mt-1" /></div>
                <div><Label>Reply-to</Label><Input type="email" value={senderForm.reply_to} onChange={(e) => setSenderForm({ ...senderForm, reply_to: e.target.value })} placeholder="resposta@empresa.com" className="mt-1" /></div>
                <Button type="submit" disabled={addSender.isPending} className="w-full">{addSender.isPending ? "Salvando..." : "Criar Remetente"}</Button>
              </form>
            </DialogContent>
          </Dialog>
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
            const isExpanded = expandedDomain === d.id;
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpandedDomain(isExpanded ? null : d.id)}>
                      {isExpanded ? "Ocultar DNS" : "Ver DNS"}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => { if (confirm("Remover este domínio?")) deleteDomain.mutate(d.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
                      {domainSenders.map((s) => <span key={s.id} className="badge-info">{s.from_name} &lt;{s.from_email}&gt;</span>)}
                    </div>
                  </div>
                )}
                {isExpanded && <DnsRecordsSection domain={d.domain} />}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
