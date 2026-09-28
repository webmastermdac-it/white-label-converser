import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";

export interface PlanConfig {
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  max_chatbots: number;
  max_conversations_month: number;
  max_leads_month: number;
  max_faqs: number;
  max_documents: number;
  doc_upload: boolean;
  calendly_integration: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
  knowledge_base_wizard: boolean;
  ecommerce_integration: boolean;
  concierge_requests: boolean;
  updated_at: string;
}

const DEFAULTS: PlanConfig = {
  plan_name: "free",
  price_monthly: 0,
  price_yearly: 0,
  max_chatbots: 1,
  max_conversations_month: 50,
  max_leads_month: 10,
  max_faqs: 5,
  max_documents: 0,
  doc_upload: false,
  calendly_integration: false,
  advanced_analytics: false,
  priority_support: false,
  knowledge_base_wizard: false,
  ecommerce_integration: false,
  concierge_requests: false,
  updated_at: new Date().toISOString(),
};

export function usePlanConfig() {
  const { role } = useAuth();
  const { plan } = usePlan();
  const [config, setConfig] = useState<PlanConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const targetPlan = role === "super_admin" ? "pro" : plan;
    const { data } = await supabase
      .from("plan_configs" as any)
      .select("*")
      .eq("plan_name", targetPlan)
      .single();

    if (data) {
      setConfig(data as any as PlanConfig);
    }
    setLoading(false);
  }, [plan, role]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Convenience flags — super_admin always gets full access
  const isAdmin = role === "super_admin";

  return {
    config,
    loading,
    refetch: fetchConfig,
    // Limits
    maxChatbots: isAdmin ? -1 : config.max_chatbots,
    maxConversationsMonth: isAdmin ? -1 : config.max_conversations_month,
    maxLeadsMonth: isAdmin ? -1 : config.max_leads_month,
    maxFaqs: isAdmin ? -1 : config.max_faqs,
    maxDocuments: isAdmin ? -1 : config.max_documents,
    // Feature flags
    canUploadDocs: isAdmin || config.doc_upload,
    canUseCalendly: isAdmin || config.calendly_integration,
    canUseAdvancedAnalytics: isAdmin || config.advanced_analytics,
    hasPrioritySupport: isAdmin || config.priority_support,
    canUseKBWizard: isAdmin || config.knowledge_base_wizard,
    canUseEcommerce: isAdmin || config.ecommerce_integration,
    canUseConciergeRequests: isAdmin || config.concierge_requests,
  };
}
