import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Users, Send, Calendar } from "lucide-react";

const STEPS = [
  { label: "Informações", icon: FileText },
  { label: "Audiência", icon: Users },
  { label: "Remetente", icon: Send },
  { label: "Agendamento", icon: Calendar },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: any;
}

export function CampaignWizardDialog({ open, onOpenChange, editCampaign }: Props) {
  const { companyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editCampaign;

  const defaultForm = {
    name: "", subject: "", preheader: "",
    template_id: "", list_id: "", sender_id: "",
    scheduled_at: "", send_now: true,
    utm_source: "", utm_medium: "email", utm_campaign: "",
  };

  const [form, setForm] = useState(defaultForm);

  // Populate form when editing
  React.useEffect(() => {
    if (editCampaign && open) {
      setForm({
        name: editCampaign.name || "",
        subject: editCampaign.subject || "",
        preheader: editCampaign.preheader || "",
        template_id: editCampaign.template_id || "",
        list_id: editCampaign.list_id || "",
        sender_id: editCampaign.sender_id || "",
        scheduled_at: editCampaign.scheduled_at ? new Date(editCampaign.scheduled_at).toISOString().slice(0, 16) : "",
        send_now: !editCampaign.scheduled_at,
        utm_source: editCampaign.utm_source || "",
        utm_medium: editCampaign.utm_medium || "email",
        utm_campaign: editCampaign.utm_campaign || "",
      });
      setStep(0);
    } else if (!open) {
      setForm(defaultForm);
      setStep(0);
    }
  }, [editCampaign, open]);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", companyId],
    queryFn: async () => { const { data } = await supabase.from("email_templates").select("id, name").order("name"); return data || []; },
    enabled: !!companyId && open,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["lists-select", companyId],
    queryFn: async () => { const { data } = await supabase.from("lists").select("id, name, list_members(id)").order("name"); return data || []; },
    enabled: !!companyId && open,
  });

  const { data: senders = [] } = useQuery({
    queryKey: ["senders", companyId],
    queryFn: async () => { const { data } = await supabase.from("senders").select("id, from_name, from_email").order("from_name"); return data || []; },
    enabled: !!companyId && open,
  });

  const canNext = () => {
    if (step === 0) return form.name && form.subject;
    if (step === 1) return form.list_id;
    if (step === 2) return true;
    return true;
  };

  const handleSave = async (status: "draft" | "scheduled") => {
    if (!companyId) return;
    setSaving(true);
    try {
      const selectedList = lists.find((l: any) => l.id === form.list_id);
      const totalRecipients = selectedList?.list_members?.length || 0;

      const payload = {
        company_id: companyId,
        created_by: user?.id,
        name: form.name,
        subject: form.subject,
        preheader: form.preheader || null,
        template_id: form.template_id || null,
        list_id: form.list_id || null,
        sender_id: form.sender_id || null,
        status,
        scheduled_at: status === "scheduled" && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        total_recipients: totalRecipients,
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || form.name || null,
      };

      if (isEditing) {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", editCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campaigns").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(isEditing ? "Campanha atualizada!" : status === "draft" ? "Rascunho salvo!" : "Campanha agendada!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-colors ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[240px]">
          {step === 0 && (
            <div className="space-y-4">
              <div><Label>Nome da campanha *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Newsletter Janeiro" className="mt-1" required /></div>
              <div><Label>Assunto do email *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex: Confira as novidades!" className="mt-1" required /></div>
              <div><Label>Preheader</Label><Input value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} placeholder="Texto que aparece ao lado do assunto" className="mt-1" /></div>
              <div>
                <Label>Template</Label>
                <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um template (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Lista de destinatários *</Label>
                <Select value={form.list_id} onValueChange={(v) => setForm({ ...form, list_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma lista" /></SelectTrigger>
                  <SelectContent>
                    {lists.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.list_members?.length || 0} contatos)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {lists.length === 0 && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                  Nenhuma lista encontrada. Crie uma lista em "Listas & Segmentos" primeiro.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Remetente</Label>
                <Select value={form.sender_id} onValueChange={(v) => setForm({ ...form, sender_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um remetente (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {senders.map((s) => <SelectItem key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {senders.length === 0 && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                  Nenhum remetente configurado. Adicione um em "Domínios & Remetentes".
                </p>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">UTM Tracking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">utm_source</Label><Input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="newsletter" className="mt-1" /></div>
                  <div><Label className="text-xs">utm_medium</Label><Input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="email" className="mt-1" /></div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button variant={form.send_now ? "default" : "outline"} onClick={() => setForm({ ...form, send_now: true })} className="flex-1">Enviar agora</Button>
                <Button variant={!form.send_now ? "default" : "outline"} onClick={() => setForm({ ...form, send_now: false })} className="flex-1">Agendar</Button>
              </div>
              {!form.send_now && (
                <div><Label>Data e hora</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1" /></div>
              )}
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold">Resumo</p>
                <p>Campanha: {form.name || "-"}</p>
                <p>Assunto: {form.subject || "-"}</p>
                <p>Lista: {lists.find((l: any) => l.id === form.list_id)?.name || "-"}</p>
                <p>Remetente: {senders.find((s) => s.id === form.sender_id)?.from_email || "Padrão"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancelar" : "Voltar"}
          </Button>
          <div className="flex gap-2">
            {step === 3 ? (
              <>
                <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>Salvar rascunho</Button>
                <Button onClick={() => handleSave(form.send_now ? "draft" : "scheduled")} disabled={saving || !canNext()} className="gap-1.5">
                  {saving ? "Salvando..." : form.send_now ? "Criar campanha" : "Agendar"} <Send className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
