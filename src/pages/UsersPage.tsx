import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Shield, Trash2, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
  { key: "contacts", label: "Contatos" },
  { key: "lists", label: "Listas & Segmentos" },
  { key: "templates", label: "Templates" },
  { key: "campaigns", label: "Campanhas" },
  { key: "workflows", label: "Automações" },
  { key: "activities", label: "Atividades" },
  { key: "domains", label: "Domínios" },
  { key: "reports", label: "Relatórios" },
  { key: "settings", label: "Configurações" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  marketing: "Marketing",
  readonly: "Somente Leitura",
};

export default function UsersPage() {
  const { companyId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("marketing");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(ALL_PERMISSIONS.map((p) => p.key));
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Fetch company users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", companyId],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, created_at")
        .eq("company_id", companyId!);

      if (!profiles) return [];

      // Get roles and permissions for each user
      const userIds = profiles.map((p) => p.user_id);
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("user_permissions").select("user_id, permission").in("user_id", userIds),
      ]);

      const rolesMap: Record<string, string> = {};
      rolesRes.data?.forEach((r) => { rolesMap[r.user_id] = r.role; });

      const permsMap: Record<string, string[]> = {};
      permsRes.data?.forEach((p) => {
        if (!permsMap[p.user_id]) permsMap[p.user_id] = [];
        permsMap[p.user_id].push(p.permission);
      });

      return profiles.map((p) => ({
        ...p,
        role: rolesMap[p.user_id] || "marketing",
        permissions: permsMap[p.user_id] || [],
      }));
    },
    enabled: !!companyId && isAdmin,
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, full_name: fullName, role, permissions: role === "admin" ? [] : selectedPerms },
      });
      if (error) throw new Error(error.message || "Falha ao convidar");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      setTempPassword(data.temp_password);
      toast.success("Usuário criado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // We can't delete auth users from client, but we can remove from company
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Usuário removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("marketing");
    setSelectedPerms(ALL_PERMISSIONS.map((p) => p.key));
    setTempPassword(null);
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-description">Gerencie usuários e permissões da sua empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Convidar Usuário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tempPassword ? "Usuário Criado" : "Convidar Usuário"}</DialogTitle>
            </DialogHeader>

            {tempPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Compartilhe as credenciais temporárias com o novo usuário. Ele deverá alterar a senha no primeiro acesso.
                </p>
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Senha temporária:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-0.5 rounded">{tempPassword}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        toast.success("Copiado!");
                      }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => { setOpen(false); resetForm(); }}>Fechar</Button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); inviteUser.mutate(); }} className="space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" className="mt-1.5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" className="mt-1.5" required />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="readonly">Somente Leitura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role !== "admin" && (
                  <div>
                    <Label className="mb-2 block">Permissões de acesso</Label>
                    <div className="space-y-2 rounded-lg border p-3">
                      {ALL_PERMISSIONS.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedPerms.includes(p.key)}
                            onCheckedChange={() => togglePerm(p.key)}
                          />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" disabled={inviteUser.isPending}>
                  <UserPlus className="h-4 w-4" />
                  {inviteUser.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "Sem nome"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : u.role === "readonly" ? "secondary" : "outline"} className="gap-1">
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <span className="text-xs text-muted-foreground">Acesso total</span>
                    ) : u.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions.slice(0, 4).map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">{ALL_PERMISSIONS.find((ap) => ap.key === p)?.label || p}</Badge>
                        ))}
                        {u.permissions.length > 4 && (
                          <Badge variant="secondary" className="text-xs">+{u.permissions.length - 4}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {u.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remover este usuário?")) deleteUser.mutate(u.user_id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
