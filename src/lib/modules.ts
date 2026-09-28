import {
  ShoppingBag, CalendarCheck, Hotel, Sparkles, Building2, ConciergeBell, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "ecommerce" | "booking" | "hotel" | "general";
export const MODULE_IDS: ModuleId[] = ["ecommerce", "booking", "hotel", "general"];

type L = { it: string; en: string };

export interface ModuleMenuItem {
  key: string;
  label: L;
  href: string;
  icon: LucideIcon;
}

export interface ModuleLeadField {
  key: string;
  label: L;
  type: "text" | "date" | "number";
}

export interface ChecklistStepDef {
  key: string;
  label: L;
  href: string;
  /** "auto" = computed from data, "manual" = user marks it as done */
  kind: "auto" | "manual";
}

export interface ModuleDef {
  id: ModuleId;
  name: L;
  description: L;
  icon: LucideIcon;
  /** HSL triplet, used with hsl() */
  color: string;
  /** Module-specific dashboard menu entries (hidden for other modules) */
  menu: ModuleMenuItem[];
  /** Integration ids recommended in the Integrations hub */
  integrations: string[];
  /** Default KB template ids (see knowledge-base/templates.ts) */
  kbTemplates: string[];
  leadFields: ModuleLeadField[];
  kpis: { key: string; label: L }[];
  checklist: ChecklistStepDef[];
}

const widgetStep: ChecklistStepDef = {
  key: "widget", kind: "auto", href: "/dashboard/embed",
  label: { it: "Installa il widget sul sito", en: "Install the widget on your site" },
};

export const MODULES: Record<ModuleId, ModuleDef> = {
  ecommerce: {
    id: "ecommerce",
    name: { it: "Ecommerce", en: "Ecommerce" },
    description: { it: "Negozi online con catalogo prodotti", en: "Online stores with product catalog" },
    icon: ShoppingBag,
    color: "35 91% 55%",
    menu: [],
    integrations: ["woocommerce", "shopify", "prestashop", "api", "feed"],
    kbTemplates: ["ecommerce"],
    leadFields: [{ key: "order_number", label: { it: "Numero ordine", en: "Order number" }, type: "text" }],
    kpis: [
      { key: "conversations", label: { it: "Conversazioni", en: "Conversations" } },
      { key: "product_views", label: { it: "Prodotti mostrati", en: "Products shown" } },
      { key: "checkouts", label: { it: "Carrelli creati", en: "Carts created" } },
      { key: "leads", label: { it: "Contatti", en: "Leads" } },
    ],
    checklist: [
      { key: "store", kind: "auto", href: "/dashboard/integrations", label: { it: "Collega il tuo store", en: "Connect your store" } },
      { key: "catalog", kind: "auto", href: "/dashboard/integrations", label: { it: "Verifica il catalogo prodotti", en: "Check the product catalog" } },
      widgetStep,
    ],
  },
  booking: {
    id: "booking",
    name: { it: "Appuntamenti", en: "Appointments" },
    description: { it: "Studi, cliniche, centri benessere", en: "Clinics, practices, wellness centers" },
    icon: CalendarCheck,
    color: "200 90% 55%",
    menu: [],
    integrations: ["calendly"],
    kbTemplates: ["dentist", "medical", "gym"],
    leadFields: [
      { key: "service", label: { it: "Servizio richiesto", en: "Requested service" }, type: "text" },
      { key: "preferred_date", label: { it: "Data preferita", en: "Preferred date" }, type: "date" },
    ],
    kpis: [
      { key: "conversations", label: { it: "Conversazioni", en: "Conversations" } },
      { key: "booking_clicks", label: { it: "Clic su prenota", en: "Booking clicks" } },
      { key: "leads", label: { it: "Contatti", en: "Leads" } },
    ],
    checklist: [
      { key: "services", kind: "auto", href: "/dashboard/knowledge-base", label: { it: "Inserisci servizi e prezzi", en: "Add services and prices" } },
      { key: "calendly", kind: "auto", href: "/dashboard/integrations", label: { it: "Collega Calendly", en: "Connect Calendly" } },
      widgetStep,
    ],
  },
  hotel: {
    id: "hotel",
    name: { it: "Hotel", en: "Hotel" },
    description: { it: "Hotel, B&B, strutture ricettive", en: "Hotels, B&Bs, accommodations" },
    icon: Hotel,
    color: "150 70% 45%",
    menu: [
      { key: "hotel-profile", label: { it: "Profilo struttura", en: "Property profile" }, href: "/dashboard/hotel/profile", icon: Building2 },
      { key: "hotel-requests", label: { it: "Richieste ospiti", en: "Guest requests" }, href: "/dashboard/hotel/requests", icon: ConciergeBell },
      { key: "hotel-results", label: { it: "Risultati", en: "Results" }, href: "/dashboard/hotel/results", icon: TrendingUp },
    ],
    integrations: ["calendly"],
    kbTemplates: ["restaurant"],
    leadFields: [
      { key: "check_in", label: { it: "Check-in", en: "Check-in" }, type: "date" },
      { key: "check_out", label: { it: "Check-out", en: "Check-out" }, type: "date" },
      { key: "guests", label: { it: "Ospiti", en: "Guests" }, type: "number" },
    ],
    kpis: [
      { key: "conversations", label: { it: "Conversazioni", en: "Conversations" } },
      { key: "guest_requests", label: { it: "Richieste ospiti", en: "Guest requests" } },
      { key: "booking_clicks", label: { it: "Clic su prenota", en: "Booking clicks" } },
    ],
    checklist: [
      { key: "profile", kind: "auto", href: "/dashboard/hotel/profile", label: { it: "Completa il profilo struttura", en: "Complete the property profile" } },
      { key: "rooms", kind: "auto", href: "/dashboard/hotel/profile", label: { it: "Aggiungi le camere", en: "Add your rooms" } },
      { key: "booking_engine", kind: "auto", href: "/dashboard/hotel/profile", label: { it: "Inserisci il link del booking engine", en: "Add the booking engine link" } },
      widgetStep,
      { key: "qr", kind: "auto", href: "/dashboard/hotel/profile?tab=qr", label: { it: "Stampa il QR code", en: "Print the QR code" } },
    ],
  },
  general: {
    id: "general",
    name: { it: "Generale", en: "General" },
    description: { it: "Qualsiasi altra attività", en: "Any other business" },
    icon: Sparkles,
    color: "35 91% 55%",
    menu: [],
    integrations: [],
    kbTemplates: [],
    leadFields: [],
    kpis: [
      { key: "conversations", label: { it: "Conversazioni", en: "Conversations" } },
      { key: "leads", label: { it: "Contatti", en: "Leads" } },
    ],
    checklist: [],
  },
};

export function toModuleId(v: string | null | undefined): ModuleId {
  if (v === "hospitality") return "hotel";
  return (MODULE_IDS as string[]).includes(v || "") ? (v as ModuleId) : "general";
}

export function getModule(v: string | null | undefined): ModuleDef {
  return MODULES[toModuleId(v)];
}

/** Every module-specific menu href, for hiding entries of other modules */
export const ALL_MODULE_MENU_HREFS = MODULE_IDS.flatMap((m) => MODULES[m].menu.map((i) => i.href));
