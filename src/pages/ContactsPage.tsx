import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Search, Filter, MoreHorizontal } from "lucide-react";

const contacts = [
  { name: "João Silva", email: "joao@empresa.com", tags: ["cliente", "premium"], status: "Ativo", origin: "Importação", date: "15/01/2026" },
  { name: "Maria Santos", email: "maria@tech.io", tags: ["lead"], status: "Ativo", origin: "Formulário", date: "20/01/2026" },
  { name: "Carlos Oliveira", email: "carlos@startup.com", tags: ["trial"], status: "Ativo", origin: "API", date: "01/02/2026" },
  { name: "Ana Costa", email: "ana@digital.com", tags: ["cliente"], status: "Descadastrado", origin: "Importação", date: "10/12/2025" },
  { name: "Pedro Lima", email: "pedro@agencia.com", tags: ["parceiro", "ativo"], status: "Ativo", origin: "Manual", date: "05/02/2026" },
  { name: "Fernanda Souza", email: "fer@ecommerce.com", tags: ["lead", "nurturing"], status: "Ativo", origin: "Landing Page", date: "18/02/2026" },
  { name: "Ricardo Mendes", email: "ricardo@corp.com.br", tags: ["enterprise"], status: "Bounced", origin: "Importação", date: "22/11/2025" },
  { name: "Luciana Alves", email: "lu@marketing.com", tags: ["cliente"], status: "Ativo", origin: "Formulário", date: "14/02/2026" },
];

const statusClass: Record<string, string> = {
  Ativo: "badge-success",
  Descadastrado: "badge-warning",
  Bounced: "badge-danger",
  Inativo: "badge-neutral",
};

export default function ContactsPage() {
  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contatos</h1>
          <p className="page-description">Gerencie sua base de contatos e leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Contato
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> Filtros
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Origem</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadastro</th>
              <th className="px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((tag) => (
                      <span key={tag} className="badge-info">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={statusClass[c.status] || "badge-neutral"}>{c.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.origin}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.date}</td>
                <td className="px-6 py-4">
                  <button className="p-1 rounded hover:bg-muted transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando 1-8 de 1.247 contatos</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm">Próximo</Button>
        </div>
      </div>
    </AppLayout>
  );
}
