// ── Hotel profile → structured prompt block (empty sections skipped) ──
// deno-lint-ignore-file no-explicit-any
export function buildHotelContext(raw: any, conversationalLead: boolean, room = ""): string {
  const hp = raw && typeof raw === "object" ? raw : {};
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x).trim());
  const line = (label: string, val: unknown) => (v(val) ? `- ${label}: ${v(val)}\n` : "");
  const sections: string[] = [];

  const p = hp.property || {};
  let s = line("Name", p.name) + line("Type", p.type) + line("Stars", p.stars) + line("Address", p.address) +
    line("Phone", p.phone) + line("Email", p.email) + line("Website", p.website) +
    line("Check-in", [v(p.checkin_from), v(p.checkin_to)].filter(Boolean).join(" – ")) +
    line("Check-out by", p.checkout_until) + line("Reception hours", p.reception_hours) +
    line("Languages spoken", Array.isArray(p.languages) ? p.languages.join(", ") : "");
  if (s) sections.push(`PROPERTY\n${s}`);

  const rooms = (Array.isArray(hp.rooms) ? hp.rooms : []).filter((r: any) => v(r?.name));
  if (rooms.length) {
    sections.push("ROOMS\n" + rooms.map((r: any) => {
      const cap = [r.max_adults ? `${r.max_adults} adults` : "", r.max_children ? `${r.max_children} children` : ""].filter(Boolean).join(" + ");
      const bits = [
        cap && `max ${cap}`, v(r.beds) && `beds: ${v(r.beds)}`, r.size_m2 ? `${r.size_m2} m²` : "",
        r.price_from ? `price from €${r.price_from}/night` : "",
        Array.isArray(r.amenities) && r.amenities.length ? `amenities: ${r.amenities.join(", ")}` : "",
        v(r.url) && `page: ${v(r.url)}`,
      ].filter(Boolean).join("; ");
      return `- ${v(r.name)}${bits ? ` (${bits})` : ""}${v(r.description) ? `: ${v(r.description)}` : ""}`;
    }).join("\n") + "\n");
  }

  const services = (Array.isArray(hp.services) ? hp.services : []).filter((x: any) => v(x?.name));
  if (services.length) {
    sections.push("SERVICES\n" + services.map((x: any) => {
      const bits = [v(x.hours) && `hours: ${v(x.hours)}`, x.included ? "included" : v(x.price) && `price: ${v(x.price)}`, v(x.url) && `page: ${v(x.url)}`].filter(Boolean).join("; ");
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

  const pages = (Array.isArray(hp.pages) ? hp.pages : []).filter((x: any) => v(x?.name) && v(x?.url));
  if (pages.length) sections.push("PAGES\n" + pages.map((x: any) => `- ${v(x.name)}: ${v(x.url)}`).join("\n") + "\n");

  const b = hp.booking || {};
  s = line("Booking phone", b.phone_booking) + line("Booking email", b.email_booking) +
    (v(b.engine_url_template) ? "- Online booking engine: available (the guest gets the link after sending the request form)\n" : "");
  if (s) sections.push(`BOOKING\n${s}`);

  const rv = hp.reviews || {};
  s = line("Google reviews", rv.google_url) + line("Booking.com reviews", rv.booking_url) + line("Tripadvisor", rv.tripadvisor_url);
  if (s) sections.push(`REVIEWS\n${s}`);

  if (!sections.length) return "";

  const quoteRule = room
    ? `The guest is already staying at the property${room ? `, in room ${room}` : ""}. IN-STAY MODE: do not offer quotes, booking links or availability checks (informational links to services and PAGES are allowed). Help with property services, opening hours, local recommendations and guest requests. Never emit [TRIGGER_LEAD_FORM] for a stay request.`
    : conversationalLead
    ? "If the guest asks about availability or a quote, first collect naturally the arrival and departure dates and the number of adults and children, one question at a time."
    : "If the guest asks about availability or a quote, first ask naturally (if not already given) for arrival and departure dates and the number of adults and children, then append the marker [TRIGGER_LEAD_FORM] on its own final line so they can send the stay request.";

  const linkRule = "When the guest asks for links, pages, photos, details or where to see something (rooms, services, contacts...), reply with the full URL taken from the HOTEL PROFILE (room page, service page, PAGES list, or the Website as fallback), as a clickable markdown link. Use ONLY URLs present in the profile; never invent or modify URLs. If the specific page is missing, give the Website URL and say the guest can find it there. Never say you cannot provide links when the profile contains a URL.";

  return `\n\n--- HOTEL PROFILE ---\n${sections.join("\n")}--- END HOTEL PROFILE ---\n\nHOTEL CONCIERGE RULES:\n- Always reply in the guest's language.\n- Only mention topics present in the HOTEL PROFILE; if a section is missing, don't talk about it (sharing the URLs listed in the profile is always allowed).\n- ${linkRule}\n- Never invent availability or final prices. Present price_from values as "starting from" and invite the guest to verify availability and the exact price for their dates.\n- Suggest the room that fits the number of guests (respect max adults/children).\n- For local recommendations suggest at most 3 relevant places.\n- ${quoteRule}`;
}
