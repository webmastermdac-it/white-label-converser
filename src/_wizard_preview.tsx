import React from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@/hooks/useLanguage";
import KnowledgeBaseWizard from "@/components/knowledge-base/KnowledgeBaseWizard";
import "@/index.css";

function WizardPreview() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-4">
        <KnowledgeBaseWizard
          clientId="preview-client"
          configId="preview-config"
          plan="pro"
          maxFaqs={-1}
          onSave={async () => {}}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <WizardPreview />
  </LanguageProvider>
);
