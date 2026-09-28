import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Save, Table2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { TONE_PRESETS } from "@/lib/tonePresets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ToneReferenceTable = () => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!open) return;
    const element = wrapRef.current;
    if (!element) return;
    const measure = () => setWide(element.offsetWidth >= 620);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-secondary p-3 text-left transition-colors hover:bg-accent">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground"><Table2 className="h-3.5 w-3.5 text-primary" />{tl("Confronta tutti i toni", "Compare all tones")}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div ref={wrapRef}>
          {wide ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[600px] text-xs">
                <thead><tr className="bg-secondary/60 text-left"><th className="px-2.5 py-2 font-medium text-foreground">{tl("Tono", "Tone")}</th><th className="px-2.5 py-2 font-medium text-foreground">{tl("Caratteristiche principali", "Key characteristics")}</th><th className="px-2.5 py-2 font-medium text-foreground">{tl("Archetipi associati", "Associated archetypes")}</th><th className="px-2.5 py-2 font-medium text-foreground">{tl("Esempio pratico", "Practical example")}</th></tr></thead>
                <tbody>{TONE_PRESETS.map((preset) => { const copy = preset[lang]; return <tr key={preset.id} className="border-t border-border align-top"><td className="whitespace-nowrap px-2.5 py-2 font-medium text-foreground">{copy.fullName}</td><td className="px-2.5 py-2 text-muted-foreground">{copy.characteristics}</td><td className="whitespace-nowrap px-2.5 py-2 text-muted-foreground">{copy.archetypes}</td><td className="px-2.5 py-2 italic text-muted-foreground">“{copy.example}”</td></tr>; })}</tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">{TONE_PRESETS.map((preset) => { const copy = preset[lang]; return <div key={preset.id} className="space-y-1 rounded-lg border border-border p-2.5"><p className="text-xs font-medium text-foreground">{copy.fullName}</p><p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{tl("Caratteristiche: ", "Characteristics: ")}</span>{copy.characteristics}</p><p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{tl("Archetipi: ", "Archetypes: ")}</span>{copy.archetypes}</p><p className="text-[11px] italic text-muted-foreground">“{copy.example}”</p></div>; })}</div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const ToneOfVoiceCard = ({ chatbotId }: { chatbotId: string }) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const [tone, setTone] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);
  const alignedLanguageRef = useRef<string | null>(null);

  useEffect(() => {
    loadedRef.current = false;
    alignedLanguageRef.current = null;
    setLoading(true);
    supabase.from("chatbot_configs").select("tone_of_voice, tone_preset_id").eq("id", chatbotId).single().then(({ data }) => {
      setTone((data as any)?.tone_of_voice || "");
      setPresetId((data as any)?.tone_preset_id ?? null);
      loadedRef.current = true;
      setLoading(false);
    });
  }, [chatbotId]);

  const persist = async (text: string, id: string | null, notify = true) => {
    setSaving(true);
    const { error } = await supabase.from("chatbot_configs").update({ tone_of_voice: text || null, tone_preset_id: id } as any).eq("id", chatbotId);
    setSaving(false);
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
    else if (notify) toast({ title: "✅", description: tl("Tono salvato!", "Tone saved!") });
  };

  useEffect(() => {
    if (!loadedRef.current || !presetId || alignedLanguageRef.current === lang) return;
    const preset = TONE_PRESETS.find((item) => item.id === presetId);
    alignedLanguageRef.current = lang;
    if (!preset) return;
    const isUnmodifiedPreset = tone === preset.it.text || tone === preset.en.text;
    const localizedText = preset[lang].text;
    if (!isUnmodifiedPreset || tone === localizedText) return;
    setTone(localizedText);
    void persist(localizedText, presetId, false);
  }, [lang, presetId, tone]);

  const applyPreset = (id: string) => {
    const preset = TONE_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    const text = preset[lang].text;
    alignedLanguageRef.current = lang;
    setTone(text);
    setPresetId(id);
    void persist(text, id);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="glass space-y-4 rounded-xl p-5">
      <div className="flex items-start gap-3"><span className="text-2xl" aria-hidden>🎭</span><div><h3 className="font-semibold text-foreground">{tl("Tono di voce", "Tone of voice")}</h3><p className="text-xs text-muted-foreground">{tl("Si applica sempre, a ogni risposta del bot", "Always applied to every bot reply")}</p></div></div>
      <div className="flex flex-wrap gap-2" aria-label={tl("Toni di voce", "Tones of voice")}>
        {TONE_PRESETS.map((preset) => { const copy = preset[lang]; const active = presetId === preset.id; return <Button key={preset.id} type="button" variant="outline" disabled={saving} aria-pressed={active} onClick={() => applyPreset(preset.id)} className={`h-auto min-w-0 max-w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left font-normal hover:border-primary/50 ${active ? "border-primary bg-primary/15 ring-1 ring-primary" : ""}`}><span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>{copy.label}</span><span className="text-[11px] text-muted-foreground">{copy.sub}</span></Button>; })}
      </div>
      <Textarea value={tone} onChange={(event) => setTone(event.target.value)} onBlur={() => void persist(tone, presetId)} rows={5} className="resize-y" aria-label={tl("Personalizza il tono", "Customize tone")} placeholder={tl("Scegli un tono sopra o descrivilo qui...", "Pick a tone above or describe it here...")} />
      <ToneReferenceTable />
      <div className="flex justify-end"><Button onClick={() => void persist(tone, presetId)} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{tl("Salva", "Save")}</Button></div>
    </div>
  );
};

export default ToneOfVoiceCard;