import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { useActiveModule } from "@/hooks/useActiveModule";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, MessageSquare,
  ChevronLeft, ChevronRight, Bot, LogOut, Inbox, ArrowUpCircle, BarChart3, Plug, Instagram, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeSelector from "@/components/ThemeSelector";
import LanguageMenu from "@/components/LanguageMenu";

const ClientSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, role } = useAuth();
  const { lang, t } = useLanguage();
  const { canUseEcommerce, canUseCalendly, config: planConfig } = usePlanConfig();
  const { botId } = useActiveModule();
  const isFree = planConfig?.plan_name === "free";
  const navigate = useNavigate();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const isIt = lang === "it";

  const isAdmin = role === "super_admin";
  const botItem = isAdmin
    ? { label: tl("I miei Bot", "My Bots"), href: "/dashboard/bots", icon: Bot }
    : {
        label: tl("Configura", "Configure"),
        href: botId ? `/dashboard/bots/${botId}` : "/dashboard/bots",
        icon: Settings,
      };

  const dataNav = [
    { label: t("overview"), href: "/dashboard", icon: LayoutDashboard, end: true },
    { label: t("leads"), href: "/dashboard/leads", icon: Inbox },
    { label: t("chatHistory"), href: "/dashboard/chats", icon: MessageSquare },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  ];

  const configNav = [
    botItem,
    { label: tl("Integrazioni", "Integrations"), href: "/dashboard/integrations", icon: Plug },
    { label: "Instagram", href: "/dashboard/instagram", icon: Instagram },
    { label: "Upgrade", href: "/dashboard/upgrade", icon: ArrowUpCircle },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItem = (item: { label: string; href: string; icon: React.ElementType; end?: boolean; badge?: number }) => {
    const link = (
      <NavLink
        to={item.href}
        end={(item as any).end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150",
            collapsed && "justify-center",
            isActive
              ? "nav-item-active"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
          )
        }
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
        {!!item.badge && <span className={cn("ml-auto min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] grid place-items-center", collapsed && "absolute translate-x-3 -translate-y-3")}>{item.badge > 99 ? "99+" : item.badge}</span>}
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
      <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-52"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      <div className={cn("flex items-center gap-3 py-5 border-b border-sidebar-border", collapsed ? "flex-col gap-2 px-2" : "px-4")}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-foreground text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              Genius <span className="text-gradient">Chatbot</span>
            </span>
            <p className="text-xs text-muted-foreground">{t("clientPortal")}</p>
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


      <nav className="px-2 py-2.5 space-y-0.5 overflow-y-auto">
        <GroupLabel>{isIt ? "Dati" : "Data"}</GroupLabel>
        {dataNav.map(renderItem)}
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto">
        <GroupLabel>{isIt ? "Configurazione" : "Configuration"}</GroupLabel>
        {configNav.map(renderItem)}
      </nav>

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

export default ClientSidebar;
