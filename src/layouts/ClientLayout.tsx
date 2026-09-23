import { Outlet } from "react-router-dom";
import ClientSidebar from "@/components/ClientSidebar";
import MobileNav from "@/components/MobileNav";
import { useLanguage } from "@/hooks/useLanguage";
import { useActiveModule } from "@/hooks/useActiveModule";
import {
  LayoutDashboard, Inbox, MessageSquare, Bot, ArrowUpCircle, BarChart3, Store
} from "lucide-react";

const ClientLayout = () => {
  const { t, lang } = useLanguage();
  const { module: activeModule } = useActiveModule();

  const clientNav = [
    { label: t("overview"), href: "/dashboard", icon: LayoutDashboard, end: true },
    { label: "I miei Bot", href: "/dashboard/bots", icon: Bot },
    { label: t("leads"), href: "/dashboard/leads", icon: Inbox },
    { label: t("chatHistory"), href: "/dashboard/chats", icon: MessageSquare },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ...activeModule.menu.map((m) => ({ label: m.label[lang], href: m.href, icon: m.icon })),
    { label: "Ecommerce", href: "/dashboard/ecommerce", icon: Store },
    { label: "Upgrade", href: "/dashboard/upgrade", icon: ArrowUpCircle },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <ClientSidebar />
      </div>
      <MobileNav items={clientNav} subtitle={t("clientPortal")} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
