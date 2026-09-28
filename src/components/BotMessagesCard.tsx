import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type AppLang } from "@/hooks/useLanguage";
import { Loader2, Save, Sparkles } from "lucide-react";

const DEFAULT_WELCOME = "Ciao! Sono un assistente virtuale basato su intelligenza artificiale. Come posso aiutarti?";
const DEFAULT_FALLBACK = "Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!";

const TARGETS = ["en", "fr", "de", "es"] as const;
type Target = (typeof TARGETS)[number];
type Lang = "it" | Target;
type Kind = "welcome" | "fallback";
type Entry = { text: string; manual: boolean };
type I18n = Record<Kind, Partial<Record<Target, Entry>>>;

const LANG_OPTIONS: { value: AppLang; flag: string; label: string }[] = [
  { value: "it", flag: "🇮🇹", label: "Italiano" },
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
  { value: "de", flag: "🇩🇪", label: "Deutsch" },
  { value: "es", flag: "🇪🇸", label: "Español" },
];

const emptyI18n = (): I18n => ({ welcome: {}, fallback: {} });

const BotMessagesCard = ({ chatbotId }: { chatbotId: string }) => {
  const { toast } = useToast();
  const { t, lang, contentLang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);
  const [i18n, setI18n] = useState<I18n>(emptyI18n());
  const viewLang: Lang = contentLang;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState<Kind | null>(null);
  const savedBase = useRef({ welcome: "", fallback: "" });

  const translate = async (w: string, f: string, targets: Target[]) => {
    const { data, error } = await supabase.functions.invoke("translate-messages", { body: { welcome: w, fallback: f, targets } });
    if (error || data?.error) throw new Error(data?.error || error?.message || "error");
    return data.translations as Record<Target, { welcome: string; fallback: string }>;
  };

  const persist = async (w: string, f: string, next: I18n) => {
    return supabase.from("chatbot_configs").update({
      welcome_message: w,
      fallback_message: f,
      welcome_msg_it: w,
      fallback_msg_it: f,
      welcome_msg_en: next.welcome.en?.text || w,
      fallback_msg_en: next.fallback.en?.text || f,
      messages_i18n: next,
    } as any).eq("id", chatbotId);
  };

  const applyTranslations = (base: I18n, tr: Partial<Record<Target, { welcome: string; fallback: string }>>, kinds: Kind[] = ["welcome", "fallback"]) => {
    const next: I18n = { welcome: { ...base.welcome }, fallback: { ...base.fallback } };
    for (const l of Object.keys(tr) as Target[]) {
      for (const k of kinds) next[k][l] = { text: tr[l]![k], manual: false };
    }
    return next;
  };

  useEffect(() => {
    supabase
      .from("chatbot_configs")
      .select("welcome_message, welcome_msg_it, fallback_message, fallback_msg_it, messages_i18n")
      .eq("id", chatbotId)
      .single()
      .then(async ({ data }) => {
        const d = data as any;
        const w = d?.welcome_message || d?.welcome_msg_it || DEFAULT_WELCOME;
        const f = d?.fallback_message || d?.fallback_msg_it || DEFAULT_FALLBACK;
        const stored: I18n = { ...emptyI18n(), ...(d?.messages_i18n || {}) };
        setWelcome(w); setFallback(f); setI18n(stored);
        savedBase.current = { welcome: w, fallback: f };
        setLoading(false);
        // First load with empty translations: generate once in background
        if (d && !Object.keys(stored.welcome).length && !Object.keys(stored.fallback).length) {
          try {
            const tr = await translate(w, f, [...TARGETS]);
            const next = applyTranslations(stored, tr);
            setI18n(next);
            await persist(w, f, next);
          } catch (e) { console.warn("[BotMessagesCard] background translation failed", e); }
        }
      });
  }, [chatbotId]);

  const valueFor = (k: Kind) => (viewLang === "it" ? (k === "welcome" ? welcome : fallback) : i18n[k][viewLang]?.text || "");

  const onEdit = (k: Kind, v: string) => {
    if (viewLang === "it") return k === "welcome" ? setWelcome(v) : setFallback(v);
    const l = viewLang;
    setI18n((p) => ({ ...p, [k]: { ...p[k], [l]: { text: v, manual: true } } }));
  };

  const save = async () => {
    setSaving(true);
    let next = i18n;
    const baseChanged = welcome !== savedBase.current.welcome || fallback !== savedBase.current.fallback;
    const targets = TARGETS.filter((l) => {
      const missing = !i18n.welcome[l]?.text || !i18n.fallback[l]?.text;
      const auto = !i18n.welcome[l]?.manual || !i18n.fallback[l]?.manual;
      return missing || (baseChanged && auto);
    });
    let warn = false;
    if (targets.length) {
      try {
        const tr = await translate(welcome, fallback, targets);
        next = { welcome: { ...i18n.welcome }, fallback: { ...i18n.fallback } };
        for (const l of Object.keys(tr) as Target[]) {
          for (const k of ["welcome", "fallback"] as Kind[]) {
            if (!next[k][l]?.manual || !next[k][l]?.text) next[k][l] = { text: tr[l][k], manual: false };
          }
        }
        setI18n(next);
      } catch { warn = true; }
    }
    const { error } = await persist(welcome, fallback, next);
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    savedBase.current = { welcome, fallback };
    if (warn) toast({ title: "⚠️", description: tl("Testo salvato, ma la traduzione automatica non è riuscita. Riprova più tardi.", "Text saved, but automatic translation failed. Try again later.") });
    else toast({ title: t("saved"), description: tl("Messaggi aggiornati", "Messages updated") });
  };

  const regenerate = async (k: Kind) => {
    if (viewLang === "it") return;
    const l = viewLang;
    setRegen(k);
    try {
      const tr = await translate(welcome, fallback, [l]);
      const next = applyTranslations(i18n, tr, [k]);
      setI18n(next);
      await persist(welcome, fallback, next);
      toast({ title: "✅", description: tl("Traduzione rigenerata", "Translation regenerated") });
    } catch (e: any) {
      toast({ title: "⚠️", description: e.message, variant: "destructive" });
    }
    setRegen(null);
  };

  const status = (k: Kind) => {
    if (viewLang === "it") return null;
    const e = i18n[k][viewLang];
    return (
      <div className="flex items-center gap-2">
        {e?.text && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {e.manual ? tl("Modificato manualmente", "Manually edited") : tl("Tradotto automaticamente", "Auto-translated")}
          </Badge>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled={regen !== null} onClick={() => regenerate(k)}>
          {regen === k ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {tl("Rigenera con AI", "Regenerate with AI")}
        </Button>
      </div>
    );
  };

  if (loading) {
    return <div className="glass rounded-xl p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const currentLanguage = LANG_OPTIONS.find((option) => option.value === contentLang) ?? LANG_OPTIONS[0];

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{tl("Messaggi del chatbot", "Chatbot messages")}</h3>
        <p className="text-xs text-muted-foreground">
          {tl("Stai modificando:", "You are editing:")} {currentLanguage.flag} {currentLanguage.label}
          {contentLang !== "it" && tl(
            " · le traduzioni si generano da sole, puoi modificarle. Cambia lingua dal menu in basso a sinistra.",
            " · translations are generated automatically; you can edit them. Change language from the menu at the bottom left.",
          )}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label>{t("welcomeMessage")}</Label>
          {status("welcome")}
        </div>
        <Textarea value={valueFor("welcome")} onChange={(e) => onEdit("welcome", e.target.value)} placeholder="Ciao! Come posso aiutarti?" rows={2} className="bg-secondary border-border resize-none" />
      </div>

      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label>{tl("Messaggio di fallback", "Fallback message")}</Label>
          {status("fallback")}
        </div>
        <Textarea value={valueFor("fallback")} onChange={(e) => onEdit("fallback", e.target.value)} placeholder={DEFAULT_FALLBACK} rows={3} className="bg-secondary border-border resize-none" />
        <p className="text-xs text-muted-foreground">{t("fallbackDesc")}</p>
      </div>

      <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0 glow-sm gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {tl("Salva", "Save")}
      </Button>
    </div>
  );
};

export default BotMessagesCard;
