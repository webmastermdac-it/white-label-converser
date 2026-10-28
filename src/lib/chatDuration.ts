/**
 * Longest span (minutes) between the first and last message that can still be a continuous chat.
 * A chat closes after ~30 minutes of inactivity, but the same browser tab reuses its session, so a guest
 * writing again hours later extends started_at → ended_at with idle time. Beyond this limit the span is
 * not a real duration and we show nothing instead of a misleading number.
 */
export const MAX_PLAUSIBLE_CHAT_MINUTES = 180;

/** Whole minutes of the chat, or null when the span is missing, negative or implausibly long. */
export function chatDurationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const ms = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  return mins > MAX_PLAUSIBLE_CHAT_MINUTES ? null : mins;
}

export const formatChatDuration = (mins: number | null) => (mins === null ? "–" : mins < 1 ? "< 1 min" : `${mins} min`);
