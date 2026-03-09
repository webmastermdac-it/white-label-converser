import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_URL = "https://chatbot.your-genius.com/widget.js";

let cachedUrl: string | null = null;

export const useWidgetUrl = () => {
  const [widgetUrl, setWidgetUrl] = useState(cachedUrl || DEFAULT_URL);

  useEffect(() => {
    if (cachedUrl) return;
    supabase
      .from("brand_settings")
      .select("widget_script_url")
      .limit(1)
      .single()
      .then(({ data }) => {
        const url = (data as any)?.widget_script_url || DEFAULT_URL;
        cachedUrl = url;
        setWidgetUrl(url);
      });
  }, []);

  return widgetUrl;
};
