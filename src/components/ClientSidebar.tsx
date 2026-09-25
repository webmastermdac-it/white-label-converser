import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { useActiveModule } from "@/hooks/useActiveModule";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, MessageSquare,
  ChevronDown, ChevronLeft, ChevronRight, Bot, LogOut, Inbox, Globe, ArrowUpCircle, BarChart3, Plug, Instagram, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeSelector from "@/components/ThemeSelector";
import { useOpenServiceRequests } from "@/hooks/useOpenServiceRequests";

const ClientSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, role } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { canUseEcommerce, canUseCalendly, config: planConfig } = usePlanConfig();
  const { botId, module: activeModule } = useActiveModule();
  const location = useLocation();
  const openRequests = useOpenServiceRequests();
  const isFree = planConfig?.plan_name === "free";
  const navigate = useNavigate();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const isIt = lang === "it";
  const verticalStorageKey = `client-nav-module-${activeModule.id}`;
  const [verticalOpen, setVerticalOpen] = useState(() => {
    const saved = localStorage.getItem(`client-nav-module-${activeModule.id}`);
    return saved === null ? activeModule.menu.length > 0 : saved === "true";
  });

  useEffect(() => {
    const saved = localStorage.getItem(verticalStorageKey);
    setVerticalOpen(saved === null ? activeModule.menu.length > 0 : saved === "true");
  }, [activeModule.id, activeModule.menu.length, verticalStorageKey]);

  const toggleVertical = () => {
    setVerticalOpen((current) => {
      const next = !current;
      localStorage.setItem(verticalStorageKey, String(next));
      return next;
    });
  };

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

  const verticalNav = activeModule.menu.map((m) => ({
    label: m.label[lang],
    href: m.href,
    icon: m.icon,
    badge: m.key === "hotel-requests" ? openRequests : 0,
  }));
  const verticalActive = verticalNav.some((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));
  const VerticalIcon = activeModule.icon;
  const verticalLabel = activeModule.id === "hotel"
    ? tl("Hotel Concierge", "Hotel Concierge")
    : activeModule.name[lang];

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
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            collapsed && "justify-center",
            isActive
              ? "nav-item-active"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
          )
        }
      >
        <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
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


      <nav className="px-2 py-3 space-y-1 overflow-y-auto">
        <GroupLabel>{isIt ? "Dati" : "Data"}</GroupLabel>
        {dataNav.map(renderItem)}
        {verticalNav.length > 0 && (
          <div className="pt-1">
            {!collapsed ? (
              <>
                <button
                  type="button"
                  onClick={toggleVertical}
                  aria-expanded={verticalOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    verticalActive ? "text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <VerticalIcon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{verticalLabel}</span>
                  <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform duration-200", verticalOpen && "rotate-180")} />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200",
                    verticalOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-2">
                      {verticalNav.map(renderItem)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">{verticalNav.map(renderItem)}</div>
            )}
          </div>
        )}
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <GroupLabel>{isIt ? "Configurazione" : "Configuration"}</GroupLabel>
        {configNav.map(renderItem)}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && (
          <>
            <ThemeSelector />
            <button
              onClick={() => setLang(lang === "it" ? "en" : "it")}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "it" ? "🇮🇹 Italiano" : "🇬🇧 English"}
            </button>
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </>
        )}
        {collapsed && <ThemeSelector collapsed />}
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
