import { useState } from "react";
import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, RefreshCw } from "lucide-react";
import { buildSiteKnowledgeText, SITE_KNOWLEDGE_SOURCE_NAME } from "@/lib/siteKnowledgeExport";

/**
 * Renders the full Knowledge Base page for the platform bot.
 * We reuse the client KB component but override the clientId context
 * via a wrapper that injects the platform client ID.
 */
const PLATFORM_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

const AdminPlatformKB = () => {
  const { toast } = useToast();
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const [syncing, setSyncing] = useState(false);

  const syncSiteContent = async () => {
    setSyncing(true);
    try {
      const { data: bot, error: botErr } = await supabase
        .from("chatbot_configs")
        .select("id")
        .eq("client_id", PLATFORM_CLIENT_ID)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (botErr) throw botErr;
      if (!bot?.id) throw new Error(tl("Bot della piattaforma non trovato.", "Platform bot not found."));

      const content = buildSiteKnowledgeText();

      const { data: existing } = await supabase
        .from("knowledge_base")
        .select("id")
        .eq("chatbot_id", bot.id)
        .eq("name", SITE_KNOWLEDGE_SOURCE_NAME)
        .maybeSingle();

      let sourceId = existing?.id as string | undefined;

      if (sourceId) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({ source_url: content, type: "txt", status: "processing", error_message: null } as any)
          .eq("id", sourceId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("knowledge_base")
          .insert({
            chatbot_id: bot.id,
            name: SITE_KNOWLEDGE_SOURCE_NAME,
            type: "txt",
            source_url: content,
            page_url: "https://chatbot.your-genius.com/",
            status: "processing",
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        sourceId = (inserted as any).id;
      }

      const { error: procErr } = await supabase.functions.invoke("process-knowledge", {
        body: { knowledge_base_id: sourceId },
      });
      if (procErr) throw procErr;

      toast({
        title: tl("Contenuti del sito sincronizzati", "Website content synced"),
        description: tl(
          "Il Genius Assistant è stato aggiornato con i testi attuali del sito, incluse soluzioni, FAQ e prezzi.",
          "Genius Assistant now uses the current website texts, including solutions, FAQs and pricing."
        ),
      });
    } catch (err: any) {
      toast({
        title: tl("Sincronizzazione non riuscita", "Sync failed"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="px-6 pt-6 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
              🧞 Genius Assistant — Knowledge Base
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {tl(
                "Gestisci istruzioni, documenti e RAG del bot della piattaforma",
                "Manage instructions, documents and RAG of the platform bot"
              )}
            </p>
          </div>
          <Button onClick={syncSiteContent} disabled={syncing} className="shrink-0">
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {tl("Sincronizza contenuti del sito", "Sync website content")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {tl(
            "Aggiorna il bot con i testi attuali del sito (home, tre soluzioni, FAQ e listino prezzi) in italiano e inglese. Premilo ogni volta che modifichi i contenuti.",
            "Updates the bot with the current website texts (home, three solutions, FAQs and pricing) in Italian and English. Use it every time you change the content."
          )}
        </p>
      </div>
      <ClientRAGKnowledgeBase overrideClientId={PLATFORM_CLIENT_ID} />
    </div>
  );
};

export default AdminPlatformKB;
