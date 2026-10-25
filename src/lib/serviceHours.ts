export type ServiceHours = { enabled: boolean; start: string; end: string };
export const SERVICE_HOURS_CHANGED_EVENT = "genius-service-hours-changed";
export const DEFAULT_SERVICE_HOURS: ServiceHours = { enabled: false, start: "08:00", end: "20:00" };

export function normalizeServiceHours(raw: unknown): ServiceHours {
  const r = raw && typeof raw === "object" ? raw as Partial<ServiceHours> : {};
  const valid = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  return { enabled: r.enabled === true, start: valid(r.start) ? r.start : "08:00", end: valid(r.end) ? r.end : "20:00" };
}

/** Local device time, start inclusive and end exclusive; equal endpoints span a full day. */
export function isWithinServiceHours(serviceHours: ServiceHours | null | undefined, date: Date): boolean {
  if (!serviceHours?.enabled) return true;
  const hours = normalizeServiceHours(serviceHours);
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = minutes(hours.start), end = minutes(hours.end);
  const now = date.getHours() * 60 + date.getMinutes();
  return end <= start ? now >= start || now < end : now >= start && now < end;
}