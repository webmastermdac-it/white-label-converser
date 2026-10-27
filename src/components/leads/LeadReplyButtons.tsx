import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tx } from "@/hooks/useLanguage";
import { replyMailto, telHref } from "@/lib/leadReply";
import type { Booking } from "@/lib/leadStay";

type L = { name?: string; email?: string; phone?: string; language?: string; booking?: Booking | null };

/** Reply by email (prefilled, in the guest's language) and/or call, depending on what the lead left. */
export default function LeadReplyButtons({ lead, size = "default", className = "", onAction }: { lead: L; size?: "default" | "sm"; className?: string; onAction?: () => void }) {
  const mail = replyMailto(lead);
  const tel = telHref(lead.phone);
  if (!mail && !tel) return <p className={`text-xs text-muted-foreground ${className}`}>{tx("No email or phone left by this contact.", "Questo contatto non ha lasciato email né telefono.")}</p>;
  const h = size === "sm" ? "h-8 text-xs px-3" : "h-11";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} onClick={(e) => e.stopPropagation()}>
      {mail && <Button asChild size={size} className={`gap-2 ${h}`}><a href={mail} onClick={onAction}><Mail className="w-4 h-4" />{tx("Reply by email", "Rispondi via email")}</a></Button>}
      {tel && <Button asChild size={size} variant="outline" className={`gap-2 ${h}`}><a href={tel} onClick={onAction}><Phone className="w-4 h-4" />{tx("Call", "Chiama")}</a></Button>}
    </div>
  );
}
