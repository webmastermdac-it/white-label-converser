export type PropertyType = "hotel" | "bnb" | "resort" | "agriturismo" | "appartamenti";
export type GuideCategory = "ristorante" | "attrazione" | "trasporti" | "spiaggia" | "shopping" | "altro";

export interface HotelRoom {
  id: string; name: string; description: string; max_adults: number | null; max_children: number | null;
  size_m2: number | null; beds: string; amenities: string[]; price_from: number | null; image_url: string;
}
export interface HotelService { id: string; name: string; description: string; hours: string; price: string; included: boolean }
export interface HotelGuideItem { id: string; category: GuideCategory; name: string; description: string; distance: string; link: string }

export interface HotelProfile {
  property: {
    name: string; type: PropertyType; stars: number | null; address: string; phone: string; email: string;
    checkin_from: string; checkin_to: string; checkout_until: string; reception_hours: string; languages: string[];
  };
  rooms: HotelRoom[];
  services: HotelService[];
  policies: { cancellation: string; children: string; pets: string; late_checkout: string; early_checkin: string; city_tax: string; payment_methods: string; parking: string };
  local_guide: HotelGuideItem[];
  booking: { engine_url_template: string; date_format: "YYYY-MM-DD" | "DD/MM/YYYY"; phone_booking: string; email_booking: string };
  reviews: { google_url: string; booking_url: string; tripadvisor_url: string };
  in_stay_quick_replies: string[];
  qr_downloaded_at: string;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const PT: PropertyType[] = ["hotel", "bnb", "resort", "agriturismo", "appartamenti"];
const GC: GuideCategory[] = ["ristorante", "attrazione", "trasporti", "spiaggia", "shopping", "altro"];

export function emptyRoom(): HotelRoom {
  return { id: uid(), name: "", description: "", max_adults: 2, max_children: 0, size_m2: null, beds: "", amenities: [], price_from: null, image_url: "" };
}
export function emptyService(): HotelService { return { id: uid(), name: "", description: "", hours: "", price: "", included: false }; }
export function emptyGuide(): HotelGuideItem { return { id: uid(), category: "ristorante", name: "", description: "", distance: "", link: "" }; }

/** Normalizes any stored/AI JSON into a complete HotelProfile */
export function normalizeHotelProfile(raw: any): HotelProfile {
  const r = raw && typeof raw === "object" ? raw : {};
  const p = r.property || {}, po = r.policies || {}, b = r.booking || {}, rv = r.reviews || {};
  return {
    property: {
      name: s(p.name), type: PT.includes(p.type) ? p.type : "hotel", stars: n(p.stars) || null, address: s(p.address),
      phone: s(p.phone), email: s(p.email), checkin_from: s(p.checkin_from), checkin_to: s(p.checkin_to),
      checkout_until: s(p.checkout_until), reception_hours: s(p.reception_hours), languages: arr(p.languages),
    },
    rooms: (Array.isArray(r.rooms) ? r.rooms : []).map((x: any) => ({
      id: s(x?.id) || uid(), name: s(x?.name), description: s(x?.description), max_adults: n(x?.max_adults),
      max_children: n(x?.max_children), size_m2: n(x?.size_m2), beds: s(x?.beds), amenities: arr(x?.amenities),
      price_from: n(x?.price_from), image_url: s(x?.image_url),
    })),
    services: (Array.isArray(r.services) ? r.services : []).map((x: any) => ({
      id: s(x?.id) || uid(), name: s(x?.name), description: s(x?.description), hours: s(x?.hours), price: s(x?.price), included: !!x?.included,
    })),
    policies: {
      cancellation: s(po.cancellation), children: s(po.children), pets: s(po.pets), late_checkout: s(po.late_checkout),
      early_checkin: s(po.early_checkin), city_tax: s(po.city_tax), payment_methods: s(po.payment_methods), parking: s(po.parking),
    },
    local_guide: (Array.isArray(r.local_guide) ? r.local_guide : []).map((x: any) => ({
      id: s(x?.id) || uid(), category: GC.includes(x?.category) ? x.category : "altro", name: s(x?.name),
      description: s(x?.description), distance: s(x?.distance), link: s(x?.link),
    })),
    booking: {
      engine_url_template: s(b.engine_url_template), date_format: b.date_format === "DD/MM/YYYY" ? "DD/MM/YYYY" : "YYYY-MM-DD",
      phone_booking: s(b.phone_booking), email_booking: s(b.email_booking),
    },
    reviews: { google_url: s(rv.google_url), booking_url: s(rv.booking_url), tripadvisor_url: s(rv.tripadvisor_url) },
    in_stay_quick_replies: arr(r.in_stay_quick_replies),
    qr_downloaded_at: s(r.qr_downloaded_at),
  };
}

/** Checklist steps computed from hotel_profile */
export function hotelChecklistStatus(raw: any) {
  const h = normalizeHotelProfile(raw);
  return {
    profile: !!h.property.name.trim() && !!h.property.checkin_from.trim(),
    rooms: h.rooms.length > 0,
    booking_engine: !!h.booking.engine_url_template.trim(),
    qr: !!h.qr_downloaded_at,
  };
}

function fmt(d: Date, f: string) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return f === "DD/MM/YYYY" ? `${dd}/${m}/${y}` : `${y}-${m}-${dd}`;
}

export function buildBookingUrl(tpl: string, format: string, ci: Date, co: Date, adults: number, children: number) {
  const enc = (v: string) => encodeURIComponent(v);
  return tpl
    .replace(/\{checkin\}/g, enc(fmt(ci, format)))
    .replace(/\{checkout\}/g, enc(fmt(co, format)))
    .replace(/\{adults\}/g, String(adults))
    .replace(/\{children\}/g, String(children));
}
