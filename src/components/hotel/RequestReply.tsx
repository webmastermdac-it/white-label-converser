import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { tx } from "@/hooks/useLanguage";
import { toast } from "sonner";

interface Props {
  requestId: string;
  reply: string | null;
  repliedAt: string | null;
  onSaved: (reply: string, repliedAt: string) => void;
}

/** Lets the property answer a guest request: the reply appears in the guest's chat. */
export default function RequestReply({ requestId, reply, repliedAt, onSaved }: Props) {
  const tl = (it: string, en: string) => tx(en, it);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const at = new Date().toISOString();
    const { error } = await supabase.from("service_requests").update({ staff_reply: value, replied_at: at }).eq("id", requestId);
    setSending(false);
    if (error) { toast.error(tl("Risposta non inviata", "Reply not sent")); return; }
    onSaved(value, at);
    setText(""); setEditing(false);
    toast.success(tl("Risposta inviata all'ospite", "Reply sent to the guest"));
  };

  if (reply && !editing) {
    return <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
      <p className="text-[11px] font-semibold uppercase text-primary">{tl("Tua risposta", "Your reply")}{repliedAt ? ` · ${new Date(repliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
      <p className="break-words text-foreground">{reply}</p>
      <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => { setText(reply); setEditing(true); }}>{tl("Modifica o invia un'altra risposta", "Edit or send another reply")}</button>
    </div>;
  }
  return <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
    <Input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={tl("Rispondi all'ospite…", "Reply to the guest…")} className="h-10 text-base md:text-sm" aria-label={tl("Risposta all'ospite", "Reply to the guest")} />
    <Button type="submit" size="sm" className="h-10 shrink-0" disabled={!text.trim() || sending}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 sm:mr-1" />}<span className="hidden sm:inline">{tl("Invia", "Send")}</span></Button>
  </form>;
}
