import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const statusClass: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-neutral",
  unsubscribed: "badge-warning",
  bounced: "badge-danger",
};
const statusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  unsubscribed: "Descadastrado",
  bounced: "Bounced",
};

export default function ContactsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", origin: "Manual" });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", companyId, search],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(50);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("contacts").insert({
        company_id: companyId,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        origin: form.origin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato adicionado!");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", origin: "Manual" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contatos</h1>
          <p className="page-description">Gerencie sua base de contatos e leads ({contacts.length})</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Importar</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Contato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addContact.mutate(); }} className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
                <Button type="submit" disabled={addContact.isPending} className="w-full">{addContact.isPending ? "Salvando..." : "Adicionar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Origem</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Nenhum contato encontrado</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-medium">{c.name || "-"}</p>
                    <p className="text-sm text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-6 py-4"><span className={statusClass[c.status] || "badge-neutral"}>{statusLabel[c.status] || c.status}</span></td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.origin || "-"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
