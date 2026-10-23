import { describe, expect, it } from "vitest";
import { extractPageLinks, fillProposalLinks, matchEnglishLink, matchLink, pageLink, type SiteLink } from "../../supabase/functions/hotel-profile-import/linkMatch";

const links: SiteLink[] = [
  { url: "https://hotel.it/camere/camera-vista-lago", title: "", en: false },
  { url: "https://hotel.it/camere/suite-panoramica", title: "", en: false },
  { url: "https://hotel.it/en/rooms/camera-vista-lago", title: "Lake View Room", en: true },
  { url: "https://hotel.it/en/", title: "English", en: true },
];

describe("hotel import deterministic links", () => {
  it("matches Camera Vista Lago to the discovered room path", () => {
    expect(matchLink("Camera Vista Lago", links)).toBe("https://hotel.it/camere/camera-vista-lago");
  });
  it("normalizes accents in Suite Panoràmica", () => {
    expect(matchLink("Suite Panoràmica", links)).toBe("https://hotel.it/camere/suite-panoramica");
  });
  it("finds the English equivalent under /en/rooms", () => {
    expect(matchEnglishLink(links[0].url, links)).toBe("https://hotel.it/en/rooms/camera-vista-lago");
  });
  it("leaves unmatched names and missing English versions empty", () => {
    expect(matchLink("Camera Bosco", links)).toBe("");
    expect(matchEnglishLink(links[1].url, links)).toBe("");
  });
  it("does not invent URLs, including AI-provided unknown URLs", () => {
    const proposal = { property: {}, rooms: [{ name: "Camera Bosco", url: "https://hotel.it/inventata", url_en: "https://hotel.it/en/invented" }], services: [] };
    const diagnostics = fillProposalLinks(proposal, links, new URL("https://hotel.it/"));
    expect(proposal.rooms[0].url).toBe("");
    expect(proposal.rooms[0].url_en).toBe("");
    expect(diagnostics).toEqual({ links_found: 4, en_links_found: 2, rooms_with_url: 0, rooms_total: 1 });
    expect(proposal.property).toEqual({ website: "https://hotel.it", website_en: "https://hotel.it/en/" });
  });
  it("fills services and keeps valid AI links", () => {
    const serviceLinks = [{ url: "https://hotel.it/servizi/spa", title: "Spa", en: false }, { url: "https://hotel.it/en/services/spa", title: "Spa", en: true }];
    const proposal = { services: [{ name: "Spa", url: "", url_en: "" }], rooms: [{ name: "Different label", url: links[0].url, url_en: "" }] };
    fillProposalLinks(proposal, [...links, ...serviceLinks], new URL("https://hotel.it/"));
    expect(proposal.services[0]).toEqual({ name: "Spa", url: serviceLinks[0].url, url_en: serviceLinks[1].url });
    expect(proposal.rooms[0].url).toBe(links[0].url);
  });
  it("prefers exact names, then the shortest room/service path", () => {
    const choices = [
      { url: "https://hotel.it/blog/camera-vista-lago", title: "Camera Vista Lago", en: false },
      { url: "https://hotel.it/camere/lunga/camera-vista-lago", title: "", en: false },
      links[0],
    ];
    expect(matchLink("Camera Vista Lago", choices)).toBe(links[0].url);
  });
  it("uses image alt, title or aria-label for image-only links and excludes files and external URLs", () => {
    const html = `<a href="/camere/camera-vista-lago"><img alt="Camera Vista Lago"></a>
      <a href='/servizi/spa' aria-label='Spa'><img></a><a href='/camere/suite-panoramica' title='Suite Panoràmica'></a>
      <a href='/foto.jpg'>Photo</a><a href='/file.pdf'>PDF</a><a href='mailto:a@hotel.it'>Email</a>
      <a href='tel:123'>Phone</a><a href='https://other.it/room'>Other</a>`;
    expect(extractPageLinks(html, new URL("https://hotel.it/"))).toEqual([
      { ...links[0], title: "Camera Vista Lago" },
      { url: "https://hotel.it/servizi/spa", title: "Spa", en: false },
      { ...links[1], title: "Suite Panoràmica" },
    ]);
    expect(pageLink("/file.PDF?download=1", "", new URL("https://hotel.it/"))).toBeNull();
  });
});