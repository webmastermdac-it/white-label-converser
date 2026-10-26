import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, Settings, BarChart3, MessageSquare, ChevronLeft,
  ChevronRight, Bot, LogOut, Shield, Inbox, CreditCard, TrendingUp, Store, Mail, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeSelector from "@/components/ThemeSelector";
import AccountSwitcher from "@/components/AccountSwitcher";
import LanguageMenu from "@/components/LanguageMenu";

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [paidSetups, setPaidSetups] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from("setup_requests").select("id", { count: "exact", head: true }).eq("status", "paid");
      setPaidSetups(count || 0);
    };
    load();
    window.addEventListener("setup-requests-changed", load);
    return () => window.removeEventListener("setup-requests-changed", load);
  }, []);

  const dataNav = [
    { label: t("overview"), href: "/admin", icon: BarChart3, end: true },
    { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { label: t("allLeads"), href: "/admin/leads", icon: Inbox },
    { label: t("chatSessions"), href: "/admin/chats", icon: MessageSquare },
  ];

  const configNav = [
    { label: t("clients"), href: "/admin/clients", icon: Users },
    { label: "Setup", href: "/admin/setup", icon: Wrench, badge: paidSetups },
    { label: tx("My Bots", "I miei Bot"), href: "/admin/bots", icon: Bot },
    { label: "Piani", href: "/admin/plans", icon: CreditCard },
    { label: "E-commerce e Catalogo", href: "/admin/ecommerce", icon: Store },
    { label: "Email & Notifiche", href: "/admin/email-templates", icon: Mail },
    { label: t("settings"), href: "/admin/settings", icon: Settings },
    { label: "🧞 Platform Bot", href: "/admin/platform-bot", icon: Bot },
    { label: "🧞 Platform Leads", href: "/admin/platform-leads", icon: Inbox },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItem = (item: { label: string; href: string; icon: React.ElementType; end?: boolean; badge?: number }) => {
    const link = (
      <NavLink
        to={item.href}
        end={item.end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            collapsed && "justify-center",
            isActive
              ? "nav-item-active"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
          )
        }
      >
        <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!!item.badge && item.badge > 0 && (
          <span className={cn("min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center", collapsed && "absolute -mt-6 ml-6 min-w-4 h-4 px-1 text-[10px]")}>
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (!collapsed) return <div key={item.href}>{link}</div>;

    return (
      <TooltipProvider key={item.href} delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const GroupLabel = ({ children }: { children: React.ReactNode }) =>
    collapsed ? null : (
      <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 py-5 border-b border-sidebar-border", collapsed ? "flex-col gap-2 px-2" : "px-4")}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-foreground text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              Genius <span className="text-gradient">Chatbot</span>
            </span>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors",
            collapsed ? "p-1 rounded-md hover:bg-sidebar-accent" : "ml-auto"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>


      {/* Account switcher */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "px-2 py-2" : "px-3 py-3")}>
        <AccountSwitcher collapsed={collapsed} />
      </div>

      {/* Data nav */}
      <nav className="px-2 py-3 space-y-1 overflow-y-auto">
        <GroupLabel>{tx("Data", "Dati")}</GroupLabel>
        {dataNav.map(renderItem)}
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      {/* Config nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <GroupLabel>{tx("Configuration", "Configurazione")}</GroupLabel>
        {configNav.map(renderItem)}
      </nav>

      {/* Language + User */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && (
          <>
            <ThemeSelector />
            <LanguageMenu />
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </>
        )}
        {collapsed && (
          <>
            <ThemeSelector collapsed />
            <LanguageMenu collapsed />
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent w-full",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && t("signOut")}
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
