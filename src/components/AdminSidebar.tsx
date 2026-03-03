import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Users, Settings, BarChart3, MessageSquare, ChevronLeft,
  ChevronRight, Bot, LogOut, Shield, Inbox, Globe, CreditCard, TrendingUp, Store, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeSelector from "@/components/ThemeSelector";

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const adminNav = [
    { label: t("overview"), href: "/admin", icon: BarChart3, end: true },
    { label: t("clients"), href: "/admin/clients", icon: Users },
    { label: t("allLeads"), href: "/admin/leads", icon: Inbox },
    { label: t("chatSessions"), href: "/admin/chats", icon: MessageSquare },
    { label: t("settings"), href: "/admin/settings", icon: Settings },
    { label: "Piani", href: "/admin/plans", icon: CreditCard },
    { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { label: "Ecommerce", href: "/admin/ecommerce", icon: Store },
    { label: "Email & Notifiche", href: "/admin/email-templates", icon: Mail },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
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
          className="ml-auto flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {adminNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "nav-item-active"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Language + User */}
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

export default AdminSidebar;
