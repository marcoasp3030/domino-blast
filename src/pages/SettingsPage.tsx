import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Gerencie as configurações da sua conta e empresa</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Company */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Empresa</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input id="company-name" defaultValue="Acme Corp" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="company-site">Website</Label>
              <Input id="company-site" defaultValue="https://acme.com" className="mt-1.5" />
            </div>
          </div>
        </section>

        {/* SendGrid */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Integração SendGrid</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure sua API Key do SendGrid para envio de emails</p>
          <div>
            <Label htmlFor="sendgrid-key">API Key</Label>
            <Input id="sendgrid-key" type="password" placeholder="SG.xxxxxxxxxxxxxxxx" className="mt-1.5" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A chave será criptografada e armazenada de forma segura.
          </p>
        </section>

        {/* Sending */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Envio</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Envio em lotes</p>
                <p className="text-xs text-muted-foreground">Limitar envio para evitar bloqueios</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div>
              <Label htmlFor="batch-size">Tamanho do lote</Label>
              <Input id="batch-size" type="number" defaultValue="500" className="mt-1.5 w-32" />
            </div>
            <div>
              <Label htmlFor="batch-delay">Intervalo entre lotes (segundos)</Label>
              <Input id="batch-delay" type="number" defaultValue="60" className="mt-1.5 w-32" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Bloquear envio sem domínio validado</p>
                <p className="text-xs text-muted-foreground">Impedir envio se SPF/DKIM não estiver configurado</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Retentativas automáticas</p>
                <p className="text-xs text-muted-foreground">Reenviar em caso de falha temporária</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* LGPD */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">LGPD & Privacidade</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Exigir consentimento na importação</p>
                <p className="text-xs text-muted-foreground">Requerer campo de consentimento ao importar contatos</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Link de descadastro obrigatório</p>
                <p className="text-xs text-muted-foreground">Incluir link de unsubscribe em todos os emails</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        <Button className="gap-2">
          <Save className="h-4 w-4" /> Salvar Configurações
        </Button>
      </div>
    </AppLayout>
  );
}
