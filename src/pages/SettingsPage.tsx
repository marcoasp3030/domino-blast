import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setWebsite(company.website || "");
    }
  }, [company]);

  const updateCompany = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("companies").update({ name, website: website || null }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Configurações salvas!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Gerencie as configurações da sua conta e empresa</p>
      </div>

      <div className="max-w-2xl space-y-8">
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Empresa</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="company-site">Website</Label>
              <Input id="company-site" value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Integração SendGrid</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure sua API Key do SendGrid para envio de emails</p>
          <div>
            <Label htmlFor="sendgrid-key">API Key</Label>
            <Input id="sendgrid-key" type="password" placeholder="SG.xxxxxxxxxxxxxxxx" className="mt-1.5" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">A chave será criptografada e armazenada de forma segura.</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Envio</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Envio em lotes</p><p className="text-xs text-muted-foreground">Limitar envio para evitar bloqueios</p></div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Bloquear envio sem domínio validado</p><p className="text-xs text-muted-foreground">Impedir envio se SPF/DKIM não estiver configurado</p></div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Retentativas automáticas</p><p className="text-xs text-muted-foreground">Reenviar em caso de falha temporária</p></div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        <Button className="gap-2" onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>
          <Save className="h-4 w-4" /> {updateCompany.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </AppLayout>
  );
}
