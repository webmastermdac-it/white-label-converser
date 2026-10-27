// ── Hotel profile → structured prompt block (empty sections skipped) ──
// deno-lint-ignore-file no-explicit-any
/** Link language rule: it → IT link (EN fallback); any other language → EN link, else IT. */
export function pickLink(url: unknown, urlEn: unknown, baseLang = "en"): string {
  const it = url == null ? "" : String(url).trim(), en = urlEn == null ? "" : String(urlEn).trim();
  return baseLang === "it" ? it || en : en || it;
}

export function buildHotelContext(raw: any, conversationalLead: boolean, room = "", baseLang = "en"): string {
  const hp = raw && typeof raw === "object" ? raw : {};
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x).trim());
  const line = (label: string, val: unknown) => (v(val) ? `- ${label}: ${v(val)}\n` : "");
  const sections: string[] = [];

  const p = hp.property || {};
  let s = line("Name", p.name) + line("Type", p.type) + line("Stars", p.stars) + line("Address", p.address) +
    line("Phone", p.phone) + line("Email", p.email) + line("Website", p.website) + line("Website (EN)", p.website_en) +
    line("Check-in", [v(p.checkin_from), v(p.checkin_to)].filter(Boolean).join(" – ")) +
    line("Check-out by", p.checkout_until) + line("Reception hours", p.reception_hours) +
    line("Languages spoken", Array.isArray(p.languages) ? p.languages.join(", ") : "");
  if (s) sections.push(`PROPERTY\n${s}`);
  if (hp.service_hours?.enabled) {
    sections.push(`Il personale gestisce le richieste dalle ${v(hp.service_hours.start) || "08:00"} alle ${v(hp.service_hours.end) || "20:00"}. Dopo aver registrato una richiesta fuori da questo orario, avvisa l'ospite che verrà gestita a partire dalle ${v(hp.service_hours.start) || "08:00"}; se è urgente (es. problema in camera) suggerisci di chiamare la reception.\n`);
  }

  const rooms = (Array.isArray(hp.rooms) ? hp.rooms : []).filter((r: any) => v(r?.name));
  if (rooms.length) {
    const roomLines = rooms.map((r: any) => {
      const cap = [r.max_adults ? `${r.max_adults} adults` : "", r.max_children ? `${r.max_children} children` : ""].filter(Boolean).join(" + ");
      const bits = [
        cap && `max ${cap}`, v(r.beds) && `beds: ${v(r.beds)}`, r.size_m2 ? `${r.size_m2} m²` : "",
        r.price_from ? `price from €${r.price_from}/night` : "",
        Array.isArray(r.amenities) && r.amenities.length ? `amenities: ${r.amenities.join(", ")}` : "",
        v(r.url) && `page: ${v(r.url)}`, v(r.url_en) && `page_en: ${v(r.url_en)}`,
        v(r.image_url) && `photo: ${v(r.image_url)}`,
      ].filter(Boolean).join("; ");
      return `- ${v(r.name)}${bits ? ` (${bits})` : ""}${v(r.description) ? `: ${v(r.description)}` : ""}`;
    });
    const hasPhotos = rooms.some((r: any) => v(r?.image_url));
    const photoRule = hasPhotos
      ? "PHOTOS: se l'ospite chiede foto/immagini/come è fatta una camera, rispondi con UNA frase breve e inserisci l'immagine in markdown nel formato ![Nome camera](URL), usando ESATTAMENTE l'URL indicato in 'photo' per quella camera. Non inventare mai URL. Se la camera non ha 'photo', di' che non hai una foto disponibile e proponi di contattare la reception. Se chiede foto di più camere, mostra al massimo 3 immagini. Questa regola ha priorità sul limite di parole e su eventuali regole di formattazione che vietano markdown.\n"
      : "";
    sections.push("ROOMS\n" + roomLines.join("\n") + "\n" + photoRule);
  }

  const services = (Array.isArray(hp.services) ? hp.services : []).filter((x: any) => v(x?.name));
  if (services.length) {
    sections.push("SERVICES\n" + services.map((x: any) => {
      const bits = [v(x.hours) && `hours: ${v(x.hours)}`, x.included ? "included" : v(x.price) && `price: ${v(x.price)}`, v(x.url) && `page: ${v(x.url)}`, v(x.url_en) && `page_en: ${v(x.url_en)}`].filter(Boolean).join("; ");
      return `- ${v(x.name)}${bits ? ` (${bits})` : ""}${v(x.description) ? `: ${v(x.description)}` : ""}`;
    }).join("\n") + "\n");
  }

  const po = hp.policies || {};
  s = line("Cancellation", po.cancellation) + line("Children", po.children) + line("Pets", po.pets) +
    line("Late check-out", po.late_checkout) + line("Early check-in", po.early_checkin) + line("City tax", po.city_tax) +
    line("Payment methods", po.payment_methods) + line("Parking", po.parking);
  if (s) sections.push(`POLICIES\n${s}`);

  const guide = (Array.isArray(hp.local_guide) ? hp.local_guide : []).filter((x: any) => v(x?.name));
  if (guide.length) {
    sections.push("LOCAL GUIDE\n" + guide.map((x: any) =>
      `- [${v(x.category) || "altro"}] ${v(x.name)}${v(x.distance) ? ` (${v(x.distance)})` : ""}${v(x.description) ? `: ${v(x.description)}` : ""}${v(x.link) ? ` — ${v(x.link)}` : ""}`
    ).join("\n") + "\n");
  }

  const pages = (Array.isArray(hp.pages) ? hp.pages : []).filter((x: any) => v(x?.name) && (v(x?.url) || v(x?.url_en)));
  if (pages.length) sections.push("PAGES\n" + pages.map((x: any) => `- ${v(x.name)}: ${v(x.url) || v(x.url_en)}${v(x.url) && v(x.url_en) ? ` (page_en: ${v(x.url_en)})` : ""}`).join("\n") + "\n");

  const b = hp.booking || {};
  s = line("Booking phone", b.phone_booking) + line("Booking email", b.email_booking) +
    (v(b.engine_url_template) ? "- Online booking engine: available (the guest gets the link after sending the request form)\n" : "");
  if (s) sections.push(`BOOKING\n${s}`);

  const rv = hp.reviews || {};
  s = line("Google reviews", rv.google_url) + line("Booking.com reviews", rv.booking_url) + line("Tripadvisor", rv.tripadvisor_url);
  if (s) sections.push(`REVIEWS\n${s}`);

  if (!sections.length) return "";

  const rawCats = Array.isArray(hp.in_stay_quick_replies) ? hp.in_stay_quick_replies.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
  const cats = rawCats.length ? rawCats : ["Pulizia/asciugamani", "Late check-out", "Taxi/transfer", "Ristorante", "Problema in camera", "Altro"];
  const requestRule = `GUEST REQUESTS FOR STAFF: when the guest asks for something the staff must do or arrange (cleaning, towels, taxi, a restaurant booking, a late check-out, a problem or breakage in the room, any other service request), reply briefly in the guest's language saying you are passing it to the reception, then append on its own final line the marker [SERVICE_REQUEST:{"category":"<CATEGORY>","message":"<short summary of the request in Italian>"}]. <CATEGORY> MUST be exactly one of: ${cats.map((c: string) => `"${c}"`).join(", ")} — choose the one that best matches the request, use "Altro" if none fits (or the closest one if "Altro" is not listed). Emit the marker as soon as the request is understood: for simple requests (a pillow, towels, cleaning, a taxi...) do NOT ask optional preferences, emit it in the same reply. Ask a question only if essential information is missing (e.g. the time for a taxi) and never ask the room, and never for plain information questions. The system registers the request after your reply; do not claim it is already done, say reception has been notified.`;

  const quoteRule = room
    ? `The guest is already staying at the property${room ? `, in room ${room}` : ""}. IN-STAY MODE: do not offer quotes, booking links or availability checks (informational links to services and PAGES are allowed). Help with property services, opening hours, local recommendations and guest requests. Never emit [TRIGGER_LEAD_FORM] for a stay request. The room number is ALREADY KNOWN (${room}) from the QR code the guest scanned: NEVER ask the guest which room they are in, and never ask them to confirm it. ${requestRule}`
    : conversationalLead
    ? "If the guest asks about availability or a quote, first collect naturally the arrival and departure dates and the number of adults and children, one question at a time."
    : "If the guest asks about availability or a quote, first ask naturally (if not already given) for arrival and departure dates and the number of adults and children, then append the marker [TRIGGER_LEAD_FORM] on its own final line so they can send the stay request.";

  const linkRule = "When the guest asks for links, pages, photos, details or where to see something (rooms, services, contacts...), reply with the full URL taken from the HOTEL PROFILE (room page, service page, PAGES list, or the Website as fallback), as a clickable markdown link. Use ONLY URLs present in the profile; never invent or modify URLs. If the specific page is missing, give the Website URL and say the guest can find it there. Never say you cannot provide links when the profile contains a URL.";
  const langLinkRule = baseLang === "it"
    ? "The visitor is Italian: use the default links (page / Website); use page_en / Website (EN) only if the default one is missing."
    : `The visitor's language is "${baseLang}": if the site has a page specific to that language among the profile URLs, use it; otherwise use the English links (page_en / Website (EN)); if no English link exists, use the default link (page / Website).`;

  return `\n\n--- HOTEL PROFILE ---\n${sections.join("\n")}--- END HOTEL PROFILE ---\n\nHOTEL CONCIERGE RULES:\n- Always reply in the guest's language.\n- Only mention topics present in the HOTEL PROFILE; if a section is missing, don't talk about it (sharing the URLs listed in the profile is always allowed).\n- ${linkRule}\n- ${langLinkRule}\n- Never invent availability or final prices. Present price_from values as "starting from" and invite the guest to verify availability and the exact price for their dates.\n- Suggest the room that fits the number of guests (respect max adults/children).\n- For local recommendations suggest at most 3 relevant places.\n- ${quoteRule}`;
}
