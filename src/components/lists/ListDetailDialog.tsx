import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, Search, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: { id: string; name: string } | null;
}

export function ListDetailDialog({ open, onOpenChange, list }: Props) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["list-members", list?.id],
    queryFn: async () => {
      if (!list) return [];
      const { data } = await supabase
        .from("list_members")
        .select("id, contact_id, contacts(id, name, email, status)")
        .eq("list_id", list.id);
      return data || [];
    },
    enabled: !!list && open,
  });

  const { data: availableContacts = [] } = useQuery({
    queryKey: ["contacts-for-list", companyId, list?.id],
    queryFn: async () => {
      const memberIds = members.map((m: any) => m.contact_id);
      let q = supabase.from("contacts").select("id, name, email").eq("status", "active").order("name").limit(100);
      if (memberIds.length > 0) {
        // We'll filter client-side since .not('id','in',array) can be tricky
      }
      const { data } = await q;
      return (data || []).filter((c) => !memberIds.includes(c.id));
    },
    enabled: !!companyId && addingContact && open,
  });

  const addMember = useMutation({
    mutationFn: async (contactId: string) => {
      if (!list) throw new Error("No list");
      const { error } = await supabase.from("list_members").insert({ list_id: list.id, contact_id: contactId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-members", list?.id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-for-list"] });
      toast.success("Contato adicionado à lista!");
      setSelectedContactId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("list_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-members", list?.id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Contato removido da lista!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredMembers = members.filter((m: any) => {
    if (!search) return true;
    const c = m.contacts;
    return c?.name?.toLowerCase().includes(search.toLowerCase()) || c?.email?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{list?.name} — Contatos</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar contatos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddingContact(!addingContact)} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {addingContact && (
          <div className="flex gap-2 mb-4 p-3 rounded-lg bg-muted">
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar contato..." /></SelectTrigger>
              <SelectContent>
                {availableContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name || c.email} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => selectedContactId && addMember.mutate(selectedContactId)} disabled={!selectedContactId || addMember.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum contato nesta lista</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Contato</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m: any) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.contacts?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{m.contacts?.email}</p>
                    </td>
                    <td className="px-2">
                      <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filteredMembers.length} contato(s)</p>
      </DialogContent>
    </Dialog>
  );
}
