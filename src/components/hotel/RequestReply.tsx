import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { tx } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ThreadMessage = { id: string; request_id: string; author: "guest" | "staff"; body: string; closes_request: boolean; created_at: string };

/** What changed on the request itself after the reply was saved. */
export type ReplyPatch = { staff_reply: string; replied_at: string; status?: "done"; resolved_at?: string };

interface Props {
  request: { id: string; bot_id: string; client_id: string; status: string };
  messages: ThreadMessage[];
  onSent: (message: ThreadMessage, patch: ReplyPatch) => void;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Conversation on a guest request: the property's replies and the guest's follow-ups in one thread.
 * "Reply and close" sends the reply and completes the request; the guest can still write back in the same chat.
 */
export default function RequestReply({ request, messages, onSent }: Props) {
  const tl = (it: string, en: string) => tx(en, it);
  const [text, setText] = useState("");
  const [sending, setSending] = useState<"send" | "close" | null>(null);

  const send = async (close: boolean) => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(close ? "close" : "send");
    // created_at is set by the database, so the guest-reply comparison never depends on this device's clock.
    const { data, error } = await supabase.from("service_request_messages")
      .insert({ request_id: request.id, bot_id: request.bot_id, client_id: request.client_id, author: "staff", body: value, closes_request: close })
      .select("id, request_id, author, body, closes_request, created_at").single();
    if (error || !data) { setSending(null); toast.error(tl("Risposta non inviata", "Reply not sent")); return; }
    const patch: ReplyPatch = { staff_reply: value, replied_at: data.created_at, ...(close ? { status: "done" as const, resolved_at: data.created_at } : {}) };
    // staff_reply / replied_at keep the latest reply for widget copies cached before the thread existed.
    const { error: updateError } = await supabase.from("service_requests").update(patch).eq("id", request.id);
    setSending(null);
    setText("");
    if (updateError) {
      // The message is saved and visible to the guest; only the request state is stale.
      onSent(data as ThreadMessage, { staff_reply: value, replied_at: data.created_at });
      toast.error(tl("Risposta inviata, ma non è stato possibile aggiornare la richiesta", "Reply sent, but the request could not be updated"));
      return;
    }
    onSent(data as ThreadMessage, patch);
    toast.success(close ? tl("Risposta inviata e richiesta chiusa", "Reply sent and request closed") : tl("Risposta inviata all'ospite", "Reply sent to the guest"));
  };

  return <div className="space-y-2">
    {messages.length > 0 && <ul className="space-y-1.5">
      {messages.map((m) => <li key={m.id} className={cn("rounded-lg px-3 py-2 text-sm", m.author === "staff" ? "bg-primary/10" : "bg-secondary")}>
        <p className={cn("text-[11px] font-semibold uppercase", m.author === "staff" ? "text-primary" : "text-muted-foreground")}>
          {m.author === "staff" ? tl("Tua risposta", "Your reply") : tl("Ospite", "Guest")} · {time(m.created_at)}
          {m.closes_request && <CheckCircle2 className="inline w-3 h-3 ml-1 -mt-0.5" aria-hidden="true" />}
        </p>
        <p className="break-words text-foreground whitespace-pre-wrap">{m.body}</p>
      </li>)}
    </ul>}
    <form className="space-y-1.5" onSubmit={(e) => { e.preventDefault(); void send(false); }}>
      <div className="flex gap-2">
        <Input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={tl("Rispondi all'ospite…", "Reply to the guest…")} className="h-10 text-base md:text-sm" aria-label={tl("Risposta all'ospite", "Reply to the guest")} />
        <Button type="submit" size="sm" className="h-10 shrink-0" disabled={!text.trim() || !!sending}>{sending === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 sm:mr-1" />}<span className="hidden sm:inline">{tl("Invia", "Send")}</span></Button>
        {request.status !== "done" && <Button type="button" size="sm" variant="outline" className="h-10 shrink-0" disabled={!text.trim() || !!sending} onClick={() => void send(true)}>{sending === "close" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:mr-1" />}<span className="hidden sm:inline">{tl("Rispondi e chiudi", "Reply and close")}</span><span className="sr-only sm:hidden">{tl("Rispondi e chiudi", "Reply and close")}</span></Button>}
      </div>
      {request.status !== "done" && text.trim() && <p className="text-xs text-muted-foreground">{tl("Il pulsante Rispondi e chiudi avvisa anche l'ospite che può continuare a scrivere qui se ha altre esigenze.", "The Reply and close button also tells the guest they can keep writing here if they need anything else.")}</p>}
    </form>
  </div>;
}
