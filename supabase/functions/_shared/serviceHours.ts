// Mirror of src/lib/serviceHours.ts, evaluated on the property's clock (Europe/Rome).
export type ServiceHours = { enabled: boolean; start: string; end: string };

const valid = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);

export function normalizeServiceHours(raw: unknown): ServiceHours {
  const r = raw && typeof raw === "object" ? raw as Partial<ServiceHours> : {};
  return { enabled: r.enabled === true, start: valid(r.start) ? r.start : "08:00", end: valid(r.end) ? r.end : "20:00" };
}

export function minutesInRome(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isWithinServiceHours(raw: unknown, date = new Date()): boolean {
  const hours = normalizeServiceHours(raw);
  if (!hours.enabled) return true;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const start = mins(hours.start), end = mins(hours.end), now = minutesInRome(date);
  return end <= start ? now >= start || now < end : now >= start && now < end;
}
