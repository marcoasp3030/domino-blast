import { Send, CheckCircle2, Eye, MousePointerClick, AlertTriangle, ShieldAlert } from "lucide-react";

const stats = [
  { label: "Enviados", value: "24.580", change: "+12%", icon: Send, gradient: "var(--gradient-primary)" },
  { label: "Entregues", value: "23.892", change: "97.2%", icon: CheckCircle2, gradient: "var(--gradient-success)" },
  { label: "Abertos", value: "8.451", change: "35.4%", icon: Eye, gradient: "var(--gradient-purple)" },
  { label: "Clicados", value: "2.134", change: "8.9%", icon: MousePointerClick, gradient: "var(--gradient-warning)" },
  { label: "Bounces", value: "688", change: "2.8%", icon: AlertTriangle, gradient: "var(--gradient-danger)" },
  { label: "Spam", value: "42", change: "0.17%", icon: ShieldAlert, gradient: "var(--gradient-danger)" },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card group">
          <div className="stat-card-gradient" style={{ background: stat.gradient }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ background: stat.gradient }}
              >
                <stat.icon className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Taxa: <span className="font-semibold text-foreground">{stat.change}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
