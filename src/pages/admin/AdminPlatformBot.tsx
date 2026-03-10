import ChatbotConfigForm from "@/components/ChatbotConfigForm";

const PLATFORM_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

const AdminPlatformBot = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
          🧞 Genius Assistant — Impostazioni
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura identità, aspetto, messaggi e notifiche del bot della piattaforma
        </p>
      </div>
      <ChatbotConfigForm clientId={PLATFORM_CLIENT_ID} />
    </div>
  );
};

export default AdminPlatformBot;
