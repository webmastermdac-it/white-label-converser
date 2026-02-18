import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import { Loader2 } from "lucide-react";

const ClientBotSettings = () => {
  const { clientId } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (clientId) setReady(true);
  }, [clientId]);

  if (!ready || !clientId) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Bot Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your chatbot's appearance and behavior</p>
      </div>
      <ChatbotConfigForm clientId={clientId} />
    </div>
  );
};

export default ClientBotSettings;
