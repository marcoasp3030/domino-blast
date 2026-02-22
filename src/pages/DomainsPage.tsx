import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, AlertCircle, Shield, RefreshCw } from "lucide-react";

const domains = [
  { domain: "acme.com", spf: "Validado", dkim: "Validado", dmarc: "Validado", status: "Ativo", senders: ["marketing@acme.com", "news@acme.com"] },
  { domain: "startup.io", spf: "Validado", dkim: "Pendente", dmarc: "Pendente", status: "Em validação", senders: ["hello@startup.io"] },
  { domain: "loja.com.br", spf: "Pendente", dkim: "Pendente", dmarc: "Pendente", status: "Pendente", senders: [] },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  Validado: { icon: CheckCircle2, className: "text-success" },
  Pendente: { icon: Clock, className: "text-warning" },
  Erro: { icon: AlertCircle, className: "text-destructive" },
};

const domainStatusClass: Record<string, string> = {
  Ativo: "badge-success",
  "Em validação": "badge-warning",
  Pendente: "badge-neutral",
};

function DnsStatus({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.Pendente;
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-4 w-4 ${config.className}`} />
      <span className="text-sm">{status}</span>
    </div>
  );
}

export default function DomainsPage() {
  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Domínios & Remetentes</h1>
          <p className="page-description">Configure seus domínios de envio e autenticação</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Domínio
        </Button>
      </div>

      <div className="space-y-4">
        {domains.map((d, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Shield className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{d.domain}</h3>
                  <span className={domainStatusClass[d.status] || "badge-neutral"}>{d.status}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-3 w-3" /> Verificar DNS
              </Button>
            </div>

            {/* DNS checklist */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">SPF</p>
                <DnsStatus status={d.spf} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">DKIM</p>
                <DnsStatus status={d.dkim} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">DMARC</p>
                <DnsStatus status={d.dmarc} />
              </div>
            </div>

            {/* Senders */}
            {d.senders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Remetentes configurados</p>
                <div className="flex flex-wrap gap-2">
                  {d.senders.map((s) => (
                    <span key={s} className="badge-info">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
