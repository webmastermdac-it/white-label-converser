import Seo from "@/components/Seo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { DEFAULT_SERVICE_HOURS, SERVICE_HOURS_CHANGED_EVENT, normalizeServiceHours, isWithinServiceHours } from "@/lib/serviceHours";
import { Outlet } from "react-router-dom";
import ClientSidebar from "@/components/ClientSidebar";
import MobileNav from "@/components/MobileNav";
import RequestAlertLamp, { useRequestLampPreference } from "@/components/hotel/RequestAlertLamp";
import { installAudioUnlock } from "@/lib/playNotice";
import { useNewLeadAlerts } from "@/hooks/useNewLeadAlerts";
import { useOpenServiceRequests } from "@/hooks/useOpenServiceRequests";
import { useNewLeadsCount } from "@/hooks/useNewLeadsCount";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import {
  LayoutDashboard, Inbox, MessageSquare, Bot, ArrowUpCircle, BarChart3, Store, Plug
} from "lucide-react";

const ClientLayout = () => {
  const { t } = useLanguage();
  const { botId, module } = useActiveModule();
  const [hoursState, setHoursState] = useState({ botId: "", hours: DEFAULT_SERVICE_HOURS });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => installAudioUnlock(), []);
  useNewLeadAlerts();
  const newLeads = useNewLeadsCount();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!botId || module.id !== "hotel") return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle();
      if (active && data) {
        const profile = data.hotel_profile as { service_hours?: unknown } | null;
        setHoursState({ botId, hours: normalizeServiceHours(profile?.service_hours) });
      }
    };
    void load();
    window.addEventListener(SERVICE_HOURS_CHANGED_EVENT, load);
    return () => { active = false; window.removeEventListener(SERVICE_HOURS_CHANGED_EVENT, load); };
  }, [botId, module.id]);
  const hoursLoaded = module.id !== "hotel" || hoursState.botId === botId;
  const withinHours = hoursLoaded && isWithinServiceHours(hoursState.hours, now);
  const { count, urgent, enabled } = useOpenServiceRequests(() => hoursLoaded && isWithinServiceHours(hoursState.hours, new Date()));
  const { lampEnabled, toggleLamp } = useRequestLampPreference();
  const lampVisible = enabled && lampEnabled && count > 0 && withinHours;

  const clientNav = [
    { label: t("overview"), href: "/dashboard", icon: LayoutDashboard, end: true },
    { label: "I miei Bot", href: "/dashboard/bots", icon: Bot },
    { label: t("leads"), href: "/dashboard/leads", icon: Inbox, badge: newLeads.count, tone: "alert" as const },
    { label: t("chatHistory"), href: "/dashboard/chats", icon: MessageSquare },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "E-commerce e Catalogo", href: "/dashboard/ecommerce", icon: Store },
    { label: t("Integrations", "Integrazioni"), href: "/dashboard/integrations", icon: Plug },
    { label: "Upgrade", href: "/dashboard/upgrade", icon: ArrowUpCircle },
  ];

  return (
    <div className={cn("flex min-h-screen bg-background", lampVisible && "request-lamp-layout pt-9")}>
      <RequestAlertLamp count={count} urgent={urgent} visible={lampVisible} />
      <Seo title="Dashboard | Genius Chatbot" path="/dashboard" noindex />
      <div className="hidden md:block">
        <ClientSidebar newLeads={newLeads.count} openRequests={count} requestsEnabled={enabled} lampEnabled={lampEnabled} onLampChange={toggleLamp} />
      </div>
      <MobileNav items={clientNav} subtitle={t("clientPortal")} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
