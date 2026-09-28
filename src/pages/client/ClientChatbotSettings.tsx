import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useWidgetUrl } from "@/hooks/useWidgetUrl";
import { useCalendlyIntegration } from "@/hooks/useCalendlyIntegration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";
import BotMessagesCard from "@/components/BotMessagesCard";
import ActivationChecklist from "@/components/ActivationChecklist";
import ToneOfVoiceCard from "@/components/ToneOfVoiceCard";
import { MODULE_CHANGED_EVENT } from "@/hooks/useActiveModule";
import {
  AlertTriangle, ArrowLeft, BellRing, Building2, CalendarDays, CheckCircle2,
  ChevronRight, Code2, Copy, Database, Eye, Globe, KeyRound,
  Loader2, Palette, Power, RefreshCw, Save, Settings, Sparkles,
} from "lucide-react";
import { getModule } from "@/lib/modules";
import HotelProfile from "@/pages/client/hotel/HotelProfile";
import HotelRequests from "@/pages/client/hotel/HotelRequests";
import HotelResults from "@/pages/client/hotel/HotelResults";

const MODULE_PAGE_COMPONENTS: Record<string, React.ComponentType<{ botIdOverride?: string }>> = {
  "/dashboard/hotel/profile": HotelProfile,
  "/dashboard/hotel/requests": HotelRequests,
  "/dashboard/hotel/results": HotelResults,
};

type SettingsSection = "install" | "general" | "appearance" | "tone" | "knowledge" | "leads" | "preview" | "concierge";
const VALID_SECTIONS = new Set<SettingsSection>(["install", "general", "appearance", "tone", "knowledge", "leads", "preview", "concierge"]);

interface ClientChatbotSettingsProps {
  adminMode?: boolean;
  botIdOverride?: string;
  hideHeader?: boolean;
}

const ClientChatbotSettings = ({ adminMode = false, botIdOverride, hideHeader = false }: ClientChatbotSettingsProps) => {
  const { botId: routeBotId } = useParams<{ botId: string }>();
  const botId = botIdOverride || routeBotId;
  const { clientId: authClientId } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const widgetUrl = useWidgetUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section = requestedSection && VALID_SECTIONS.has(requestedSection as SettingsSection) ? requestedSection as SettingsSection : null;

  const [botConfig, setBotConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingLeads, setSavingLeads] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [conciergeSection, setConciergeSection] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);
  const [leadFormMode, setLeadFormMode] = useState<"immediate" | "conversational" | "after_messages" | "smart">("conversational");
  const [leadFormMessageCount, setLeadFormMessageCount] = useState(3);

  const clientId = botConfig?.client_id || authClientId;
  const botModule = getModule(botConfig?.business_vertical);
  const conciergeMenu = botModule.menu;
  const currentConciergeKey = conciergeMenu.some((item) => item.key === conciergeSection) ? conciergeSection : conciergeMenu[0]?.key;
  const currentConciergeItem = conciergeMenu.find((item) => item.key === currentConciergeKey);
  const ConciergeComponent = currentConciergeItem ? MODULE_PAGE_COMPONENTS[currentConciergeItem.href] : undefined;
  const backPath = adminMode ? "/admin/bots" : "/dashboard/bots";
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const calendly = useCalendlyIntegration(clientId, botId);
  const supportsCalendly = botModule.integrations.includes("calendly");

  const openSection = (next: SettingsSection | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("section", next); else params.delete("section");
    setSearchParams(params);
  };

  const fetchBot = useCallback(async () => {
    if (!botId) return;
    const { data } = await supabase.from("chatbot_configs").select("*").eq("id", botId).single();
    if (data) {
      setBotConfig(data);
      setName(data.name);
      setSiteUrl((data as any).site_url || "");
      setIsActive(data.is_active ?? true);
      setInactivityTimeout((data as any).inactivity_timeout_minutes ?? 30);
      setLeadFormMode(((data as any).lead_form_mode as any) || "conversational");
      setLeadFormMessageCount((data as any).lead_form_message_count ?? 3);
    }
    setLoading(false);
  }, [botId]);

  useEffect(() => {
    const handler = () => { void fetchBot(); };
    window.addEventListener(MODULE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(MODULE_CHANGED_EVENT, handler);
  }, [fetchBot]);
  useEffect(() => { void fetchBot(); }, [fetchBot]);
  useEffect(() => {
    if (section === "concierge" && botConfig && conciergeMenu.length === 0) openSection(null);
  }, [section, botConfig, conciergeMenu.length]);

  const saveGeneral = async () => {
    if (!botId) return;
    setSavingGeneral(true);
    const { error } = await supabase.from("chatbot_configs").update({ name, site_url: siteUrl, is_active: isActive } as any).eq("id", botId);
    setSavingGeneral(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "✅", description: tl("Impostazioni salvate!", "Settings saved!") });
    void fetchBot();
  };

  const saveLeads = async () => {
    if (!botId) return;
    setSavingLeads(true);
    const { error } = await supabase.from("chatbot_configs").update({ inactivity_timeout_minutes: inactivityTimeout, lead_form_mode: leadFormMode, lead_form_message_count: leadFormMessageCount } as any).eq("id", botId);
    setSavingLeads(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "✅", description: tl("Lead e notifiche salvati!", "Leads and notifications saved!") });
    void fetchBot();
  };

  const copyToken = () => {
    if (!botConfig?.embed_token) return;
    void navigator.clipboard.writeText(botConfig.embed_token);
    toast({ title: tl("Copiato!", "Copied!"), description: tl("Token copiato", "Token copied") });
  };
  const copyEmbed = () => {
    if (!botConfig?.embed_token) return;
    void navigator.clipboard.writeText(`<!-- ${name} -->\n<script src="${widgetUrl}" data-token="${botConfig.embed_token}" async></script>`);
    toast({ title: tl("Copiato!", "Copied!"), description: tl("Codice embed copiato", "Embed code copied") });
  };

  const iframeSrcDoc = botConfig?.embed_token ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title><style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666}.hint{text-align:center;padding:2rem}.hint p{font-size:14px;margin:8px 0}</style></head><body><div class="hint"><p>👇 ${tl("Clicca il pulsante per aprire il chatbot", "Click the button to open the chatbot")}</p></div><script>try{Object.keys(sessionStorage).forEach(function(k){if(k.startsWith('genius_widget_'))sessionStorage.removeItem(k)})}catch(e){}<\/script><script src="${widgetUrl}" data-token="${botConfig.embed_token}" async><\/script></body></html>` : "";

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!botConfig) return <div className="p-6"><Link to={backPath} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{tl("Torna ai chatbot", "Back to chatbots")}</Link><p className="mt-4 text-muted-foreground">{tl("Chatbot non trovato", "Chatbot not found")}</p></div>;

  const sectionTitles: Record<SettingsSection, string> = {
    install: tl("Installazione sul sito", "Website installation"), general: tl("Generale", "General"), appearance: tl("Aspetto", "Appearance"), tone: tl("Personalità e tono", "Personality and tone"), knowledge: tl("Conoscenza", "Knowledge"), leads: tl("Lead e notifiche", "Leads and notifications"), preview: tl("Anteprima", "Preview"), concierge: "Concierge",
  };

  const statusBadge = (complete: boolean) => <Badge variant={complete ? "default" : "secondary"} className={complete ? "bg-success text-success-foreground" : ""}>{complete ? tl("Completo", "Complete") : tl("Da completare", "To complete")}</Badge>;
  const hubCards = [
    { key: "general" as const, icon: Settings, title: tl("Generale", "General"), description: tl("Nome, sito, stato e messaggi", "Name, website, status and messages"), badge: statusBadge(Boolean(name.trim() && siteUrl.trim())) },
    { key: "appearance" as const, icon: Palette, title: tl("Aspetto", "Appearance"), description: tl("Modulo, avatar, colori e posizione", "Module, avatar, colors and position") },
    { key: "tone" as const, icon: Sparkles, title: tl("Personalità e tono", "Personality and tone"), description: tl("Come parla il tuo bot", "How your bot speaks"), badge: statusBadge(Boolean(botConfig.tone_of_voice || botConfig.tone_preset_id)) },
    { key: "knowledge" as const, icon: Database, title: tl("Conoscenza", "Knowledge"), description: tl("FAQ, documenti e istruzioni", "FAQs, documents and instructions") },
    { key: "leads" as const, icon: BellRing, title: tl("Lead e notifiche", "Leads and notifications"), description: tl("Form contatti, email e chat concluse", "Contact forms, email and ended chats"), badge: statusBadge(Boolean(botConfig.notification_email)) },
    { key: "preview" as const, icon: Eye, title: tl("Anteprima", "Preview"), description: tl("Prova il bot dal vivo", "Try the bot live") },
    ...(conciergeMenu.length ? [{ key: "concierge" as const, icon: Building2, title: "Concierge", description: tl("Profilo, richieste e risultati", "Profile, requests and results") }] : []),
  ];

  const InstallationContent = () => <div className="space-y-5 rounded-xl border-2 border-primary bg-primary/5 p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15"><KeyRound className="h-5 w-5 text-primary" /></div><div><h3 className="text-lg font-semibold text-foreground">{tl("Il token del tuo chatbot", "Your chatbot token")}</h3><p className="text-sm text-muted-foreground">{tl("È il codice che collega il tuo sito a questo chatbot: senza token il chatbot non si carica e non riceve nessuna configurazione.", "It's the code that connects your website to this chatbot: without the token the chatbot won't load or receive any configuration.")}</p></div></div><div className="flex gap-2"><Input value={botConfig.embed_token} readOnly className="h-12 bg-secondary font-mono text-base" /><Button variant="outline" onClick={copyToken} className="h-12 gap-1.5"><Copy className="h-4 w-4" />{tl("Copia", "Copy")}</Button></div><div className="space-y-2"><Label>{tl("Codice Embed", "Embed Code")}</Label><div className="relative rounded-lg bg-secondary p-3 pr-24"><pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">{`<!-- ${name} -->\n<script src="${widgetUrl}" data-token="${botConfig.embed_token}" async></script>`}</pre><Button variant="ghost" size="sm" className="absolute right-2 top-2 gap-1.5" onClick={copyEmbed}><Code2 className="h-3.5 w-3.5" />{tl("Copia", "Copy")}</Button></div></div><ol className="list-decimal space-y-1 pl-5 text-sm text-foreground"><li>{tl("Copia il codice qui sopra.", "Copy the code above.")}</li><li>{tl("Incollalo nel tuo sito subito prima del tag </body>, su tutte le pagine dove vuoi il chatbot (di solito nel footer o nel template globale).", "Paste it into your site right before the </body> tag, on every page where you want the chatbot (usually in the footer or global template).")}</li><li>{tl("Salva e pubblica il sito: il chatbot appare in basso a destra.", "Save and publish the site: the chatbot appears in the bottom right corner.")}</li></ol><div className="space-y-1.5 rounded-lg border border-border bg-secondary/60 p-4"><p className="text-sm font-medium">{tl("Dove incollarlo", "Where to paste it")}</p><ul className="space-y-1 text-xs text-muted-foreground"><li><b className="text-foreground">WordPress:</b> {tl("plugin WPCode o \"Insert Headers and Footers\", sezione Footer", "WPCode or \"Insert Headers and Footers\" plugin, Footer section")}</li><li><b className="text-foreground">Shopify:</b> {tl("theme.liquid prima di </body>", "theme.liquid before </body>")}</li><li><b className="text-foreground">Wix:</b> {tl("Impostazioni > Codice personalizzato > Body-fine", "Settings > Custom code > Body-end")}</li><li><b className="text-foreground">Webflow:</b> Project settings &gt; Custom code &gt; Footer</li><li><b className="text-foreground">Squarespace:</b> {tl("Impostazioni > Avanzate > Inserimento codice > Footer", "Settings > Advanced > Code injection > Footer")}</li></ul></div><div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{tl("Ogni chatbot ha un token unico. Non condividerlo pubblicamente fuori dal sito: se cambia, il widget smette di funzionare.", "Each chatbot has a unique token. Don't share it publicly outside your site: if it changes, the widget stops working.")}</span></div></div>;

  return (
    <div className="space-y-5 p-4 animate-fade-in-up md:p-6">
      {!section && !hideHeader && <div><Link to={backPath} className="mb-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{tl("Torna ai chatbot", "Back to chatbots")}</Link><h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{name || botConfig.name}</h1>{siteUrl && <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><Globe className="h-3.5 w-3.5" />{siteUrl}</p>}</div>}

      {!section ? <>
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15"><KeyRound className="h-5 w-5 text-primary" /></div><div className="min-w-0"><h2 className="font-semibold text-foreground">{tl("Il token del tuo chatbot", "Your chatbot token")}</h2><p className="text-xs text-muted-foreground">{tl("Collega il tuo sito a questo chatbot. Senza token il widget non si carica.", "Connect your website to this chatbot. Without a token, the widget won't load.")}</p><code className="mt-2 block truncate font-mono text-xs text-foreground">{botConfig.embed_token}</code></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={copyToken} className="gap-2"><Copy className="h-4 w-4" />{tl("Copia token", "Copy token")}</Button><Button onClick={() => openSection("install")} className="gap-2">{tl("Come si installa", "How to install")}<ChevronRight className="h-4 w-4" /></Button></div></div></div>
        {clientId && botId && <ActivationChecklist key={`${botId}-${botConfig.business_vertical}`} botId={botId} clientId={clientId} vertical={botConfig.business_vertical} calendlyUrl={botConfig.calendly_url} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{hubCards.map((card) => <Button key={card.key} variant="outline" onClick={() => openSection(card.key)} className="h-auto min-h-32 items-start justify-start rounded-xl border-border bg-card p-5 text-left hover:border-primary/50 hover:bg-accent/30"><div className="flex w-full gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><card.icon className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1 whitespace-normal"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-foreground">{card.title}</h2>{card.badge}</div><p className="mt-1 text-xs font-normal text-muted-foreground">{card.description}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></div></Button>)}</div>
      </> : <>
        <div><Button variant="ghost" onClick={() => openSection(null)} className="mb-2 -ml-3 gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" />{tl("Configurazione", "Configuration")}</Button><h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{sectionTitles[section]}</h1></div>
        {section === "install" && <InstallationContent />}
        {section === "general" && <div className="space-y-4"><div className="glass space-y-5 rounded-xl p-6"><div className={`flex items-center justify-between gap-3 rounded-xl border p-5 ${isActive ? "border-success/30 bg-success/10" : "border-destructive/20 bg-destructive/5"}`}><div className="flex items-start gap-3"><Power className={`mt-0.5 h-5 w-5 ${isActive ? "text-success" : "text-muted-foreground"}`} /><div><p className="text-sm font-medium text-foreground">{tl("Bot attivo", "Bot active")}</p><p className="text-xs text-muted-foreground">{tl("Abilita/disabilita il widget", "Enable/disable the widget")}</p></div></div><Switch checked={isActive} onCheckedChange={setIsActive} /></div><div className="space-y-2"><Label>{tl("Nome del bot", "Bot name")}</Label><Input value={name} onChange={(event) => setName(event.target.value)} className="bg-secondary" /></div><div className="space-y-2"><Label>{tl("URL del sito", "Site URL")}</Label><Input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://mysite.com" className="bg-secondary" /></div><Button onClick={saveGeneral} disabled={savingGeneral} className="gap-2"><Save className="h-4 w-4" />{tl("Salva", "Save")}</Button></div>{botId && <BotMessagesCard chatbotId={botId} />}</div>}
        {section === "appearance" && clientId && <ChatbotConfigForm clientId={clientId} chatbotId={botId} sectionFilter={["identity", "appearance"]} />}
        {section === "tone" && botId && <ToneOfVoiceCard chatbotId={botId} />}
        {section === "knowledge" && <ClientRAGKnowledgeBase overrideChatbotId={botId} />}
        {section === "leads" && <div className="space-y-6">{!adminMode && supportsCalendly && <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"><CalendarDays className="h-5 w-5 text-primary" /><div className="flex-1"><p className="text-sm font-medium text-foreground">{calendly.calendlyUrl ? tl("Calendly connesso", "Calendly connected") : tl("Calendly non connesso", "Calendly not connected")}</p></div><Button variant="outline" asChild><Link to="/dashboard/integrations">{calendly.calendlyUrl ? tl("Gestisci", "Manage") : tl("Configura Calendly", "Configure Calendly")}</Link></Button></div>}<div className="glass space-y-5 rounded-xl p-6"><div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4"><Label>{tl("Quando una chat è da ritenersi conclusa", "When a chat should be considered ended")}</Label><p className="text-xs text-muted-foreground">{tl("Dopo quanti minuti di inattività la chat viene chiusa automaticamente", "After how many minutes of inactivity the chat is automatically closed")}</p><div className="flex flex-wrap gap-2">{[30,60,90].map((minutes) => <Button key={minutes} type="button" variant="outline" onClick={() => setInactivityTimeout(minutes)} className={`rounded-full ${inactivityTimeout === minutes ? "border-primary bg-primary/15 text-primary" : ""}`}>{inactivityTimeout === minutes && <CheckCircle2 className="mr-1.5 h-4 w-4" />}{minutes} {tl("minuti", "minutes")}</Button>)}</div></div><div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4"><Label>{tl("Quando mostrare il form per lasciare nome e contatti", "When to show the contact form")}</Label><p className="text-xs text-muted-foreground">{tl("Scegli quando il bot chiede nome ed email al visitatore", "Choose when the bot asks the visitor for name and email")}</p><div className="flex flex-wrap gap-2">{([{id:"immediate",it:"Subito all'inizio della chat",en:"Right at the start of the chat"},{id:"conversational",it:"Conversazionale (il bot chiede nome ed email in chat)",en:"Conversational (bot asks for name and email in chat)"},{id:"after_messages",it:"Dopo un numero di messaggi",en:"After a number of messages"},{id:"smart",it:"Solo su richiesta del bot",en:"Only when the bot asks"}] as const).map((mode) => <Button key={mode.id} type="button" variant="outline" onClick={() => setLeadFormMode(mode.id)} className={`h-auto min-h-11 whitespace-normal rounded-full ${leadFormMode === mode.id ? "border-primary bg-primary/15 text-primary" : ""}`}>{leadFormMode === mode.id && <CheckCircle2 className="mr-1.5 h-4 w-4" />}{tl(mode.it, mode.en)}</Button>)}</div>{leadFormMode === "after_messages" && <div className="flex items-center gap-2"><Input type="number" min={1} max={20} value={leadFormMessageCount} onChange={(event) => setLeadFormMessageCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="w-20 bg-secondary" /><span className="text-sm text-muted-foreground">{tl("messaggi", "messages")}</span></div>}</div><Button onClick={saveLeads} disabled={savingLeads} className="gap-2"><Save className="h-4 w-4" />{tl("Salva", "Save")}</Button></div>{clientId && <ChatbotConfigForm clientId={clientId} chatbotId={botId} sectionFilter={["notifications"]} />}</div>}
        {section === "preview" && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{tl("Anteprima live del widget", "Live widget preview")}</p><Button variant="outline" size="sm" onClick={() => setPreviewKey((key) => key + 1)} className="gap-2"><RefreshCw className="h-3.5 w-3.5" />{tl("Ricarica", "Reload")}</Button></div>{botConfig.embed_token ? <div className="glass overflow-hidden rounded-xl border border-border" style={{ minHeight: 550 }}><iframe key={previewKey} srcDoc={iframeSrcDoc} className="h-full w-full border-0" style={{ minHeight: 550 }} title="Widget Preview" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" /></div> : <div className="glass rounded-xl p-8 text-center text-muted-foreground">{tl("Nessun chatbot configurato", "No chatbot configured")}</div>}</div>}
        {section === "concierge" && conciergeMenu.length > 0 && <div className="space-y-4"><div className="flex flex-wrap gap-2">{conciergeMenu.map((item) => { const Icon = item.icon; const selected = currentConciergeKey === item.key; return <Button key={item.key} type="button" variant="outline" onClick={() => setConciergeSection(item.key)} className={`rounded-full ${selected ? "border-primary bg-primary/15 text-primary" : ""}`}><Icon className="mr-1.5 h-4 w-4" />{item.label[lang]}</Button>; })}</div>{ConciergeComponent && botId && <ConciergeComponent key={`${botId}-${currentConciergeKey}`} botIdOverride={botId} />}</div>}
      </>}
    </div>
  );
};

export default ClientChatbotSettings;
