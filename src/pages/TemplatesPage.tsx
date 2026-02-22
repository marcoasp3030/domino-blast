import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Copy, MoreHorizontal, Layout } from "lucide-react";

const templates = [
  { name: "Newsletter Padrão", type: "Newsletter", updated: "20/02/2026", used: 12 },
  { name: "Promoção Black Friday", type: "Promocional", updated: "18/02/2026", used: 3 },
  { name: "Welcome Email", type: "Transacional", updated: "15/02/2026", used: 28 },
  { name: "Reengajamento", type: "Automação", updated: "10/02/2026", used: 5 },
  { name: "Convite Webinar", type: "Evento", updated: "08/02/2026", used: 2 },
  { name: "Pesquisa NPS", type: "Feedback", updated: "01/02/2026", used: 7 },
];

const typeColors: Record<string, string> = {
  Newsletter: "badge-info",
  Promocional: "badge-warning",
  Transacional: "badge-success",
  Automação: "badge-neutral",
  Evento: "badge-info",
  Feedback: "badge-neutral",
};

export default function TemplatesPage() {
  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-description">Crie e gerencie seus modelos de email</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all cursor-pointer group">
            {/* Preview placeholder */}
            <div className="h-40 bg-muted flex items-center justify-center border-b border-border">
              <Layout className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t.name}</h3>
                <span className={typeColors[t.type] || "badge-neutral"}>{t.type}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Atualizado em {t.updated} · Usado {t.used}x</p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" className="gap-1 flex-1">
                  <Eye className="h-3 w-3" /> Preview
                </Button>
                <Button variant="outline" size="sm" className="gap-1 flex-1">
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
