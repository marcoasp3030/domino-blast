import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, FlaskConical, Mail, Eye, MousePointerClick, AlertTriangle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ABTestResultsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    name: string;
    subject: string | null;
    subject_b: string | null;
    ab_test_winner: string | null;
    ab_test_status: string | null;
  } | null;
}

interface VariantMetrics {
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  uniqueOpens: Set<string>;
  uniqueClicks: Set<string>;
}

function emptyMetrics(): VariantMetrics {
  return { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, uniqueOpens: new Set(), uniqueClicks: new Set() };
}

export function ABTestResultsPanel({ open, onOpenChange, campaign }: ABTestResultsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["ab-test-results", campaign?.id],
    queryFn: async () => {
      // Get sends with variant info
      const { data: sends } = await supabase
        .from("sends")
        .select("id, contact_id, ab_variant, status")
        .eq("campaign_id", campaign!.id)
        .in("ab_variant", ["A", "B"]);

      // Get events for this campaign
      const { data: events } = await supabase
        .from("events")
        .select("contact_id, event_type")
        .eq("campaign_id", campaign!.id);

      const variantContacts: Record<string, Set<string>> = { A: new Set(), B: new Set() };
      (sends || []).forEach((s: any) => {
        if (s.ab_variant === "A" || s.ab_variant === "B") {
          variantContacts[s.ab_variant].add(s.contact_id);
        }
      });

      const metrics: Record<string, VariantMetrics> = { A: emptyMetrics(), B: emptyMetrics() };

      // Count sends per variant
      (sends || []).forEach((s: any) => {
        const v = s.ab_variant as string;
        if (v === "A" || v === "B") {
          metrics[v].sent++;
        }
      });

      // Count events per variant
      (events || []).forEach((e: any) => {
        const variant = variantContacts.A.has(e.contact_id) ? "A" : variantContacts.B.has(e.contact_id) ? "B" : null;
        if (!variant) return;
        const m = metrics[variant];
        switch (e.event_type) {
          case "delivered": m.delivered++; break;
          case "open": m.opens++; m.uniqueOpens.add(e.contact_id); break;
          case "click": m.clicks++; m.uniqueClicks.add(e.contact_id); break;
          case "bounce": m.bounces++; break;
        }
      });

      return metrics;
    },
    enabled: !!campaign?.id && open,
  });

  if (!campaign) return null;

  const metricsA = data?.A;
  const metricsB = data?.B;
  const winner = campaign.ab_test_winner;

  const rate = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

  const renderVariantCard = (variant: "A" | "B", metrics: VariantMetrics | undefined, subject: string | null) => {
    const isWinner = winner === variant;
    const del = metrics?.delivered || 0;
    const openRate = parseFloat(rate(metrics?.uniqueOpens.size || 0, del));
    const clickRate = parseFloat(rate(metrics?.uniqueClicks.size || 0, del));
    const bounceRate = parseFloat(rate(metrics?.bounces || 0, metrics?.sent || 0));

    return (
      <div className={`flex-1 rounded-xl border p-4 space-y-4 transition-all ${isWinner ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isWinner ? "default" : "secondary"} className="text-xs font-bold">
              {variant}
            </Badge>
            {isWinner && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Trophy className="h-3.5 w-3.5" /> Vencedor
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{metrics?.sent || 0} envios</span>
        </div>

        {/* Subject */}
        <p className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
          "{subject || "—"}"
        </p>

        {/* Metrics */}
        <div className="space-y-3">
          <MetricRow
            icon={Mail}
            label="Entregas"
            value={del}
            total={metrics?.sent || 0}
            color="text-emerald-600"
          />
          <MetricRow
            icon={Eye}
            label="Aberturas"
            value={metrics?.uniqueOpens.size || 0}
            total={del}
            rate={openRate}
            color="text-violet-600"
            highlight={isWinner}
          />
          <MetricRow
            icon={MousePointerClick}
            label="Cliques"
            value={metrics?.uniqueClicks.size || 0}
            total={del}
            rate={clickRate}
            color="text-amber-600"
            highlight={isWinner}
          />
          <MetricRow
            icon={AlertTriangle}
            label="Rejeições"
            value={metrics?.bounces || 0}
            total={metrics?.sent || 0}
            rate={bounceRate}
            color="text-red-500"
            invertHighlight
          />
        </div>

        {/* Score */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Score
            </span>
            <span className="text-sm font-bold tabular-nums">
              {((metrics?.uniqueClicks.size || 0) * 3) + (metrics?.uniqueOpens.size || 0)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">cliques × 3 + aberturas</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            Resultados do Teste A/B
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{campaign.name}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="flex-1 h-[320px] rounded-xl" />
            <Skeleton className="flex-1 h-[320px] rounded-xl" />
          </div>
        ) : (
          <>
            {/* Status badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs">
                {campaign.ab_test_status === "testing" && "⏳ Teste em andamento — aguardando dados"}
                {campaign.ab_test_status === "winner_selected" && "🏆 Vencedor selecionado — enviando para restantes"}
                {campaign.ab_test_status === "winner_sent" && "✅ Teste concluído — vencedor enviado"}
                {!["testing", "winner_selected", "winner_sent"].includes(campaign.ab_test_status || "") && "Pendente"}
              </Badge>
            </div>

            {/* Side by side comparison */}
            <div className="flex gap-4">
              {renderVariantCard("A", metricsA, campaign.subject)}
              {renderVariantCard("B", metricsB, campaign.subject_b)}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  total,
  rate,
  color,
  highlight,
  invertHighlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  total: number;
  rate?: number;
  color: string;
  highlight?: boolean;
  invertHighlight?: boolean;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          {label}
        </span>
        <span className="font-semibold tabular-nums">
          {value}
          {rate !== undefined && (
            <span className="ml-1 text-muted-foreground font-normal">({rate}%)</span>
          )}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
