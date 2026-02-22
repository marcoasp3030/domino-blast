import { Badge } from "@/components/ui/badge";

const campaigns = [
  { name: "Black Friday 2025", status: "Concluída", sent: 5200, openRate: "42.1%", ctr: "12.3%", date: "20/02/2026" },
  { name: "Newsletter Fevereiro", status: "Enviando", sent: 3100, openRate: "38.5%", ctr: "9.7%", date: "22/02/2026" },
  { name: "Lançamento Produto X", status: "Agendada", sent: 0, openRate: "-", ctr: "-", date: "25/02/2026" },
  { name: "Reengajamento Q1", status: "Rascunho", sent: 0, openRate: "-", ctr: "-", date: "-" },
  { name: "Webinar Março", status: "Agendada", sent: 0, openRate: "-", ctr: "-", date: "01/03/2026" },
];

const statusClass: Record<string, string> = {
  Concluída: "badge-success",
  Enviando: "badge-info",
  Agendada: "badge-warning",
  Rascunho: "badge-neutral",
  Pausada: "badge-warning",
  Erro: "badge-danger",
};

export function RecentCampaigns() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-base font-semibold">Campanhas Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas campanhas criadas</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr className="border-t border-border">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanha</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Enviados</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Abertura</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">CTR</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4">
                  <span className={statusClass[c.status] || "badge-neutral"}>{c.status}</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{c.sent > 0 ? c.sent.toLocaleString() : "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">{c.openRate}</td>
                <td className="px-6 py-4 text-muted-foreground">{c.ctr}</td>
                <td className="px-6 py-4 text-muted-foreground">{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
