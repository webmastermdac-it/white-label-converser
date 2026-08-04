import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/AdminSidebar";
import MobileNav from "@/components/MobileNav";
import { useLanguage } from "@/hooks/useLanguage";
import {
  BarChart3, Users, Inbox, MessageSquare, Settings, CreditCard, TrendingUp, Store, Bot
} from "lucide-react";

const AdminLayout = () => {
  const { t } = useLanguage();

  const adminNav = [
    { label: t("overview"), href: "/admin", icon: BarChart3, end: true },
    { label: t("clients"), href: "/admin/clients", icon: Users },
    { label: t("allLeads"), href: "/admin/leads", icon: Inbox },
    { label: t("chatSessions"), href: "/admin/chats", icon: MessageSquare },
    { label: t("settings"), href: "/admin/settings", icon: Settings },
    { label: "I miei Bot", href: "/admin/bots", icon: Bot },
    { label: "Piani", href: "/admin/plans", icon: CreditCard },
    { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { label: "Ecommerce", href: "/admin/ecommerce", icon: Store },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <MobileNav items={adminNav} subtitle="Admin" />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
