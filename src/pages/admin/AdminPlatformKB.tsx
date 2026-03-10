import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";

/**
 * Renders the full Knowledge Base page for the platform bot.
 * We reuse the client KB component but override the clientId context
 * via a wrapper that injects the platform client ID.
 */
const PLATFORM_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

const AdminPlatformKB = () => {
  return (
    <div className="animate-fade-in-up">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
          🧞 Genius Assistant — Knowledge Base
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci istruzioni, documenti e RAG del bot della piattaforma
        </p>
      </div>
      <ClientRAGKnowledgeBase overrideClientId={PLATFORM_CLIENT_ID} />
    </div>
  );
};

export default AdminPlatformKB;
