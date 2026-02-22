import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusClass: Record<string, string> = {
  completed: "badge-success",
  sending: "badge-info",
  scheduled: "badge-warning",
  draft: "badge-neutral",
  paused: "badge-warning",
  error: "badge-danger",
};

const statusLabel: Record<string, string> = {
  completed: "Concluída",
  sending: "Enviando",
  scheduled: "Agendada",
  draft: "Rascunho",
  paused: "Pausada",
  error: "Erro",
};

export function RecentCampaigns() {
  const { companyId } = useAuth();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["recent-campaigns", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Destinatários</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhuma campanha criada ainda
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className={statusClass[c.status] || "badge-neutral"}>{statusLabel[c.status] || c.status}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{c.total_recipients || 0}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
