import { Link } from "react-router-dom";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import { Button } from "@/components/ui/button";
import { Database, Users } from "lucide-react";

const PLATFORM_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

const AdminPlatformBot = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
            🧞 Genius Assistant — Impostazioni
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura identità, aspetto, messaggi e notifiche del bot della piattaforma
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/platform-bot/kb">
            <Button variant="outline" size="sm" className="border-border">
              <Database className="w-4 h-4 mr-2" /> Knowledge Base
            </Button>
          </Link>
          <Link to="/admin/platform-leads">
            <Button variant="outline" size="sm" className="border-border">
              <Users className="w-4 h-4 mr-2" /> Platform Leads
            </Button>
          </Link>
        </div>
      </div>
      <ChatbotConfigForm clientId={PLATFORM_CLIENT_ID} />
    </div>
  );
};

export default AdminPlatformBot;
