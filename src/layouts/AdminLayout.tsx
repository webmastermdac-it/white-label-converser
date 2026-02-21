import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/AdminSidebar";
import MobileNav from "@/components/MobileNav";
import { useLanguage } from "@/hooks/useLanguage";
import {
  BarChart3, Users, Inbox, MessageSquare, Settings
} from "lucide-react";

const AdminLayout = () => {
  const { t } = useLanguage();

  const adminNav = [
    { label: t("overview"), href: "/admin", icon: BarChart3, end: true },
    { label: t("clients"), href: "/admin/clients", icon: Users },
    { label: t("allLeads"), href: "/admin/leads", icon: Inbox },
    { label: t("chatSessions"), href: "/admin/chats", icon: MessageSquare },
    { label: t("settings"), href: "/admin/settings", icon: Settings },
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
