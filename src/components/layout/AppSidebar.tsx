import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ListFilter, Palette, Send, Globe,
  BarChart3, Settings, ChevronLeft, ChevronRight, LogOut, Activity,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import nutricarLogo from "@/assets/nutricar-logo.webp";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Contatos", path: "/contacts" },
  { icon: ListFilter, label: "Listas & Segmentos", path: "/lists" },
  { icon: Palette, label: "Templates", path: "/templates" },
  { icon: Send, label: "Campanhas", path: "/campaigns" },
  { icon: Activity, label: "Atividades", path: "/activities" },
  { icon: Globe, label: "Domínios", path: "/domains" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { profile, user, signOut } = useAuth();

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{ background: "hsl(var(--sidebar-background))", borderColor: "hsl(var(--sidebar-border))" }}
    >
      <div className="flex h-16 items-center gap-3 px-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <img src={nutricarLogo} alt="Nutricar" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
        {!collapsed && (
          <div className="animate-slide-in-left">
            <h1 className="text-base font-bold" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>Nutricar</h1>
            <p className="text-[11px]" style={{ color: "hsl(var(--sidebar-foreground))" }}>Email Marketing</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn("sidebar-link", isActive && "active")} title={collapsed ? item.label : undefined}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t p-4" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "hsl(var(--sidebar-accent))", color: "hsl(var(--sidebar-primary))" }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="truncate text-xs" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                  {user?.email}
                </p>
              </div>
            </div>
            <button onClick={signOut} className="p-1.5 rounded hover:bg-sidebar-accent transition-colors" title="Sair">
              <LogOut className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground))" }} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
