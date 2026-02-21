import { Outlet } from "react-router-dom";
import ClientSidebar from "@/components/ClientSidebar";
import MobileNav from "@/components/MobileNav";
import { useLanguage } from "@/hooks/useLanguage";
import {
  LayoutDashboard, Inbox, MessageSquare, Settings, PlayCircle, Code2
} from "lucide-react";

const ClientLayout = () => {
  const { t } = useLanguage();

  const clientNav = [
    { label: t("overview"), href: "/dashboard", icon: LayoutDashboard, end: true },
    { label: t("leads"), href: "/dashboard/leads", icon: Inbox },
    { label: t("chatHistory"), href: "/dashboard/chats", icon: MessageSquare },
    { label: t("botSettings"), href: "/dashboard/settings", icon: Settings },
    { label: t("testChatbot"), href: "/dashboard/preview", icon: PlayCircle },
    { label: t("embedCode"), href: "/dashboard/embed", icon: Code2 },
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
