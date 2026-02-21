import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KBSections, KBDocument, defaultSections } from "./types";
import { buildSystemPrompt } from "./buildSystemPrompt";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2 } from "lucide-react";
import StructuredSections from "./StructuredSections";
import DocumentUpload from "./DocumentUpload";
import WebScraper from "./WebScraper";
import GuidedWizard from "./GuidedWizard";
import IndustryTemplates from "./IndustryTemplates";
import SystemPromptPreview from "./SystemPromptPreview";

interface Props {
  clientId: string;
  configId: string;
  botName: string;
  fallbackMessage: string;
  onKnowledgeBaseUpdated: (kb: string) => void;
}

const KnowledgeBaseBuilder: React.FC<Props> = ({
  clientId,
  configId,
  botName,
  fallbackMessage,
  onKnowledgeBaseUpdated,
}) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<KBSections>(defaultSections);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [scrapedContent, setScrapedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chatbot_configs")
        .select("knowledge_base_sections, knowledge_base_documents, knowledge_base_scraped")
        .eq("id", configId)
        .single();

      if (data) {
        if (data.knowledge_base_sections && typeof data.knowledge_base_sections === "object") {
          setSections({ ...defaultSections, ...(data.knowledge_base_sections as any) });
        }
        if (Array.isArray(data.knowledge_base_documents)) {
          setDocuments(data.knowledge_base_documents as any);
        }
        if (data.knowledge_base_scraped) {
          setScrapedContent(data.knowledge_base_scraped as string);
        }
      }
      setLoading(false);
    };
    load();
  }, [configId]);

  const save = useCallback(async () => {
    await supabase
      .from("chatbot_configs")
      .update({
        knowledge_base_sections: sections as any,
        knowledge_base_documents: documents as any,
        knowledge_base_scraped: scrapedContent,
      })
      .eq("id", configId);
  }, [configId, sections, documents, scrapedContent]);

  const handleSectionsChange = (s: KBSections) => setSections(s);

  const handleDocumentsChange = (docs: KBDocument[]) => {
    setDocuments(docs);
    // auto-save docs
    supabase
      .from("chatbot_configs")
      .update({ knowledge_base_documents: docs as any })
      .eq("id", configId);
  };

  const handleScrapedContent = (content: string) => {
    setScrapedContent(content);
    supabase
      .from("chatbot_configs")
      .update({ knowledge_base_scraped: content })
      .eq("id", configId);
  };

  const handleWizardComplete = (s: KBSections) => {
    setSections(s);
    supabase
      .from("chatbot_configs")
      .update({ knowledge_base_sections: s as any })
      .eq("id", configId);
    toast({ title: "Sezioni aggiornate dal wizard!" });
  };

  const handleTemplateApply = (s: KBSections) => {
    setSections(s);
    supabase
      .from("chatbot_configs")
      .update({ knowledge_base_sections: s as any })
      .eq("id", configId);
    toast({ title: "Template applicato!" });
  };

  const generatePrompt = () => {
    const prompt = buildSystemPrompt({
      botName,
      sections,
      documents,
      scrapedContent,
      fallbackMessage,
    });
    setGeneratedPrompt(prompt);
    setShowPreview(true);
  };

  const confirmPrompt = (prompt: string) => {
    onKnowledgeBaseUpdated(prompt);
    toast({ title: "System prompt aggiornato e salvato!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="structured" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1">
          <TabsTrigger value="structured" className="text-xs flex-1 min-w-[100px]">
            🏗️ Sezioni
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs flex-1 min-w-[100px]">
            📄 Documenti
          </TabsTrigger>
          <TabsTrigger value="scraping" className="text-xs flex-1 min-w-[100px]">
            🌐 Sito Web
          </TabsTrigger>
          <TabsTrigger value="wizard" className="text-xs flex-1 min-w-[100px]">
            💬 Q&A Guidato
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs flex-1 min-w-[100px]">
            📋 Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="mt-4">
          <StructuredSections
            sections={sections}
            onChange={handleSectionsChange}
            onBlurSave={save}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentUpload
            clientId={clientId}
            documents={documents}
            onChange={handleDocumentsChange}
          />
        </TabsContent>

        <TabsContent value="scraping" className="mt-4">
          <WebScraper
            scrapedContent={scrapedContent}
            onUseContent={handleScrapedContent}
          />
        </TabsContent>

        <TabsContent value="wizard" className="mt-4">
          <GuidedWizard onComplete={handleWizardComplete} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <IndustryTemplates onApply={handleTemplateApply} />
        </TabsContent>
      </Tabs>

      <Button
        onClick={generatePrompt}
        className="w-full gradient-primary text-white border-0 glow-sm"
      >
        <Wand2 className="w-4 h-4 mr-2" /> Generate System Prompt
      </Button>

      <SystemPromptPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        prompt={generatedPrompt}
        onConfirm={confirmPrompt}
      />
    </div>
  );
};

export default KnowledgeBaseBuilder;
