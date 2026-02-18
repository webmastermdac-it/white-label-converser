import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const AdminClientConfig = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("clients").select("name").eq("id", clientId).single().then(({ data }) => {
      setClientName(data?.name || "Client");
      setLoading(false);
    });
  }, [clientId]);

  if (loading || !clientId) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <Link to="/admin/clients" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
          {clientName} — Chatbot Config
        </h1>
      </div>
      <ChatbotConfigForm clientId={clientId} />
    </div>
  );
};

export default AdminClientConfig;
