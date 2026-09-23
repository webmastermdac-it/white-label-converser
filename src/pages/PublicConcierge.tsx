import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface PublicConfig {
  name?: string;
  avatar?: string;
  background_color?: string;
  primary_color?: string;
  business_vertical?: string;
  hotel?: { property_name?: string };
}

const PublicConcierge = () => {
  const { embed_token } = useParams();
  const [params] = useSearchParams();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const room = (params.get("room") || "").slice(0, 40);

  useEffect(() => {
    if (!embed_token) return;
    const base = import.meta.env.VITE_SUPABASE_URL;
    fetch(`${base}/functions/v1/widget-config?embed_token=${encodeURIComponent(embed_token)}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setConfig);
  }, [embed_token]);

  useEffect(() => {
    if (!config || !embed_token) return;
    document.querySelectorAll("#genius-chat-widget").forEach((node) => node.remove());
    document.querySelectorAll("script[data-public-concierge]").forEach((node) => node.remove());
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.dataset.token = embed_token;
    script.dataset.fullscreen = "true";
    if (room) script.dataset.room = room;
    script.dataset.publicConcierge = "true";
    document.body.appendChild(script);
    return () => {
      script.remove();
      document.querySelectorAll("#genius-chat-widget").forEach((node) => node.remove());
    };
  }, [config, embed_token, room]);

  const background = config?.background_color || "#1A1A2E";
  const accent = config?.primary_color || "#F5A623";
  const propertyName = config?.hotel?.property_name || config?.name || "Concierge";

  return (
    <main className="min-h-screen" style={{ backgroundColor: background }}>
      {!config && <div className="min-h-screen grid place-items-center text-foreground">Concierge…</div>}
      {config && (
        <div className="fixed top-0 inset-x-0 z-10 h-1" style={{ backgroundColor: accent }} aria-hidden="true" />
      )}
      <h1 className="sr-only">{propertyName}{room ? ` — Camera ${room}` : ""}</h1>
    </main>
  );
};

export default PublicConcierge;