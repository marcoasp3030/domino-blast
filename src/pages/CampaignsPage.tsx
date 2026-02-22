import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Send, Calendar, MoreHorizontal, Eye } from "lucide-react";

const campaigns = [
  { name: "Black Friday 2025", subject: "🔥 Ofertas imperdíveis!", status: "Concluída", sent: 5200, openRate: "42.1%", ctr: "12.3%", date: "20/02/2026" },
  { name: "Newsletter Fevereiro", subject: "As novidades do mês", status: "Enviando", sent: 3100, openRate: "38.5%", ctr: "9.7%", date: "22/02/2026" },
  { name: "Lançamento Produto X", subject: "Chegou! Conheça o Produto X", status: "Agendada", sent: 0, openRate: "-", ctr: "-", date: "25/02/2026" },
  { name: "Reengajamento Q1", subject: "Sentimos sua falta!", status: "Rascunho", sent: 0, openRate: "-", ctr: "-", date: "-" },
  { name: "Webinar Março", subject: "Inscreva-se no nosso webinar", status: "Agendada", sent: 0, openRate: "-", ctr: "-", date: "01/03/2026" },
  { name: "Welcome Series", subject: "Bem-vindo à nossa plataforma", status: "Concluída", sent: 890, openRate: "61.2%", ctr: "22.4%", date: "10/02/2026" },
];

const statusClass: Record<string, string> = {
  Concluída: "badge-success",
  Enviando: "badge-info",
  Agendada: "badge-warning",
  Rascunho: "badge-neutral",
  Pausada: "badge-warning",
  Erro: "badge-danger",
};

const statusIcon: Record<string, typeof Send> = {
  Concluída: Eye,
  Enviando: Send,
  Agendada: Calendar,
};

export default function CampaignsPage() {
  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-description">Crie e gerencie suas campanhas de email</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nova Campanha
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar campanhas..." className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4">
        {campaigns.map((c, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <span className={statusClass[c.status] || "badge-neutral"}>{c.status}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">Assunto: {c.subject}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Enviados</p>
                  <p className="font-semibold">{c.sent > 0 ? c.sent.toLocaleString() : "-"}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Abertura</p>
                  <p className="font-semibold">{c.openRate}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">CTR</p>
                  <p className="font-semibold">{c.ctr}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-semibold">{c.date}</p>
                </div>
                <button className="p-1.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
