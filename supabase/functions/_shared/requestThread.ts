// Pure helpers for the guest-request conversation thread (shared by chat and service-request-followup).

/** After a request is closed the guest can still write in the same thread for this long. */
export const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ThreadRequest = {
  status: string;
  category: string;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
};
export type ThreadMessage = { author: "guest" | "staff"; body: string; created_at: string };

/** Open and in-progress requests always accept follow-ups; closed ones only within the reopen window. */
export function canFollowUp(request: Pick<ThreadRequest, "status" | "resolved_at" | "created_at">, now = Date.now()): boolean {
  if (request.status !== "done") return true;
  const closedAt = Date.parse(request.resolved_at || request.created_at);
  return Number.isFinite(closedAt) && now - closedAt <= REOPEN_WINDOW_MS;
}

const clip = (text: string, max = 300) => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
};

/** Prompt block that tells the AI which request the guest is talking about and how to route a reply. */
export function buildActiveRequestContext(request: ThreadRequest, messages: ThreadMessage[]): string {
  const status = request.status === "done" ? "completed" : request.status === "in_progress" ? "being handled by the staff" : "waiting for the staff";
  const original = clip((request.message || "").replace(/^\[chat\]\s*/, ""));
  const thread = messages
    .slice(-8)
    .map((m) => `  - ${m.author === "staff" ? "Staff (human reception)" : "Guest"}: ${clip(m.body)}`)
    .join("\n");
  return `\n\nACTIVE GUEST REQUEST (the guest already sent this request to the staff from this chat):
- Category: ${clip(request.category, 80)}
- Original request: ${original || "(no text)"}
- Status: ${status}
${thread ? `- Messages exchanged on this request (oldest first):\n${thread}\n` : ""}RULES FOR THIS REQUEST (they refine the guest-request rules above):
- Messages in the chat history that start with "🛎️" are written by the human staff of the property, NOT by you. Never present them as your own words and never contradict them.
- If the guest only acknowledges or thanks (e.g. "thanks", "ok perfect"), answer briefly and warmly, with no marker.
- If the guest asks something you can answer reliably from the HOTEL PROFILE and the staff does not need to act, answer it, with no marker.
- If the guest answers the staff, adds details, changes or follows up on this request, or asks something you cannot answer reliably, reply briefly in the guest's language saying you are passing it to the reception, and append on its own final line the marker [REQUEST_FOLLOWUP:{"message":"<short summary in Italian of what the guest wrote>"}]. When in doubt, use [REQUEST_FOLLOWUP].
- Use [SERVICE_REQUEST:...] only for a clearly different service need that is unrelated to this request.
- Never say the staff has already done something unless the staff messages above say so.`;
}
