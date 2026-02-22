import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanData {
  plan: "free" | "starter" | "pro";
  isFree: boolean;
  isStarter: boolean;
  isPro: boolean;
  isStarterOrAbove: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function usePlan(): PlanData {
  const { clientId } = useAuth();
  const [plan, setPlan] = useState<"free" | "starter" | "pro">("free");
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("clients")
      .select("plan")
      .eq("id", clientId)
      .single();
    if (data) {
      setPlan((data.plan || "free") as "free" | "starter" | "pro");
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    isFree: plan === "free",
    isStarter: plan === "starter",
    isPro: plan === "pro",
    isStarterOrAbove: plan === "starter" || plan === "pro",
    loading,
    refetch: fetchPlan,
  };
}
