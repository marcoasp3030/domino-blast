import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ListFilter,
  Palette,
  Send,
  Globe,
  BarChart3,
  Settings,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Contatos", path: "/contacts" },
  { icon: ListFilter, label: "Listas & Segmentos", path: "/lists" },
  { icon: Palette, label: "Templates", path: "/templates" },
  { icon: Send, label: "Campanhas", path: "/campaigns" },
  { icon: Globe, label: "Domínios", path: "/domains" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{
        background: "hsl(var(--sidebar-background))",
        borderColor: "hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
          <Mail className="h-5 w-5" style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
        </div>
        {!collapsed && (
          <div className="animate-slide-in-left">
            <h1 className="text-base font-bold" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
              MailPulse
            </h1>
            <p className="text-[11px]" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              Email Marketing
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn("sidebar-link", isActive && "active")}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Empresa mock */}
      {!collapsed && (
        <div className="border-t p-4" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: "hsl(var(--sidebar-accent))", color: "hsl(var(--sidebar-primary))" }}>
              AC
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
                Acme Corp
              </p>
              <p className="truncate text-xs" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                admin@acme.com
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
