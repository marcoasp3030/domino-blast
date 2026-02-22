import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Filter } from "lucide-react";

const lists = [
  { name: "Clientes Ativos", type: "Fixa", contacts: 2340, description: "Todos os clientes com assinatura ativa" },
  { name: "Leads Quentes", type: "Dinâmica", contacts: 456, description: "Contatos que abriram 3+ emails nos últimos 30 dias" },
  { name: "Novos Cadastros", type: "Dinâmica", contacts: 128, description: "Contatos cadastrados nos últimos 7 dias" },
  { name: "Inativos 90 dias", type: "Dinâmica", contacts: 892, description: "Sem interação nos últimos 90 dias" },
  { name: "VIP Enterprise", type: "Fixa", contacts: 45, description: "Clientes enterprise com contrato ativo" },
  { name: "Importação Jan/2026", type: "Fixa", contacts: 1200, description: "Contatos importados em janeiro de 2026" },
];

export default function ListsPage() {
  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Listas & Segmentos</h1>
          <p className="page-description">Organize seus contatos em listas e segmentos</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nova Lista
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar listas..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className={l.type === "Dinâmica" ? "badge-info" : "badge-neutral"}>{l.type}</span>
            </div>
            <h3 className="font-semibold mb-1">{l.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{l.description}</p>
            <p className="text-sm">
              <span className="font-semibold">{l.contacts.toLocaleString()}</span>
              <span className="text-muted-foreground"> contatos</span>
            </p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
