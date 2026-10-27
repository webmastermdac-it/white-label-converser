import { tx } from "@/hooks/useLanguage";

export interface Booking { check_in?: string; check_out?: string; adults?: number; children?: number; room_id?: string | null; room_name?: string | null; sends?: number }

export const nightsOf = (b?: Booking | null) => (b?.check_in && b?.check_out ? Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86400000) : null);
export const fmtDay = (iso?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : "—"; };
export const guestsOf = (b?: Booking | null) => (b ? `${b.adults ?? 0}${b.children ? ` + ${b.children}` : ""}` : "—");

/** A lead that carries stay dates is a real stay request, not a generic contact. */
export const isStayRequest = (lead?: { booking?: Booking | null; source?: string | null } | null) =>
  !!lead && (!!lead.booking?.check_in || lead.source === "hotel_quote");

/** One-line summary: "05/11/2026 → 10/11/2026 · 5 nights · 2 guests · Suite". */
export function stayLine(b?: Booking | null): string {
  if (!b?.check_in) return "";
  const nights = nightsOf(b);
  const parts = [`${fmtDay(b.check_in)} → ${fmtDay(b.check_out)}`];
  if (nights !== null) parts.push(`${nights} ${nights === 1 ? tx("night", "notte") : tx("nights", "notti")}`);
  parts.push(`${guestsOf(b)} ${tx("guests", "ospiti")}`);
  if (b.room_name) parts.push(b.room_name);
  return parts.join(" · ");
}
