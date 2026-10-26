import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, ShieldCheck, Info, Check } from "lucide-react";
import type { Platform } from "@/hooks/useEcommerceIntegration";
import { tx } from "@/hooks/useLanguage";

type StorePlatform = "woocommerce" | "shopify" | "prestashop";

interface PermRow {
  label: { it: string; en: string };
  detail: { it: string; en: string };
}

const WHERE: Record<StorePlatform, { it: string; en: string }> = {
  woocommerce: {
    it: "Genera le chiavi in WooCommerce → Impostazioni → Avanzate → REST API",
    en: "Generate keys in WooCommerce → Settings → Advanced → REST API",
  },
  shopify: {
    it: "Crea una app in Shopify Admin → App → Sviluppa app e copia l'Admin API access token",
    en: "Create an app in Shopify Admin → Apps → Develop apps and copy the Admin API access token",
  },
  prestashop: {
    it: "Genera la chiave in PrestaShop → Parametri avanzati → Servizi web",
    en: "Generate key in PrestaShop → Advanced Parameters → Web Services",
  },
};

const PERMS: Record<StorePlatform, PermRow[]> = {
  woocommerce: [
    {
      label: { it: "Catalogo prodotti", en: "Product catalog" },
      detail: { it: "sola lettura", en: "read only" },
    },
    {
      label: { it: "Acquisti dal chatbot", en: "Purchases from the chatbot" },
      detail: { it: "lettura e scrittura (chiavi Read/Write)", en: "read & write (Read/Write keys)" },
    },
    {
      label: { it: "Stato ordini", en: "Order status" },
      detail: { it: "lettura ordini (Read basta)", en: "order read access (Read is enough)" },
    },
  ],
  shopify: [
    {
      label: { it: "Catalogo prodotti", en: "Product catalog" },
      detail: { it: "sola lettura", en: "read only" },
    },
    {
      label: { it: "Acquisti dal chatbot", en: "Purchases from the chatbot" },
      detail: { it: "lettura e scrittura (Storefront access token)", en: "read & write (Storefront access token)" },
    },
    {
      label: { it: "Stato ordini", en: "Order status" },
      detail: {
        it: "lettura ordini (scope read_orders, e read_all_orders per ordini oltre 60 giorni)",
        en: "order read access (read_orders scope, and read_all_orders for orders older than 60 days)",
      },
    },
  ],
  prestashop: [
    {
      label: { it: "Catalogo prodotti", en: "Product catalog" },
      detail: { it: "sola lettura", en: "read only" },
    },
    {
      label: { it: "Acquisti dal chatbot", en: "Purchases from the chatbot" },
      detail: {
        it: "lettura e scrittura (Add/Modify su carts, customers e addresses)",
        en: "read & write (Add/Modify on carts, customers and addresses)",
      },
    },
    {
      label: { it: "Stato ordini", en: "Order status" },
      detail: {
        it: "lettura ordini (GET su orders, customers, order_states, order_carriers e carriers)",
        en: "order read access (GET on orders, customers, order_states, order_carriers and carriers)",
      },
    },
  ],
};

/**
 * Compact IT/EN guide shown under each ecommerce integration detail:
 * where to find credentials + required permissions, or an info note
 * for api/feed integrations.
 */
const PlatformGuide = ({ platform, isIt }: { platform: Platform; isIt: boolean }) => {
  if (platform === "api" || platform === "feed") {
    return (
      <Alert className="text-xs">
        <Info className="w-3.5 h-3.5" />
        <AlertDescription>
          {tx("With this integration the bot knows products, prices and availability. Purchases from the chatbot and order status require WooCommerce, Shopify or PrestaShop.", "Con questa integrazione il bot conosce prodotti, prezzi e disponibilità. Acquisti dal chatbot e stato ordini richiedono WooCommerce, Shopify o PrestaShop.")}
        </AlertDescription>
      </Alert>
    );
  }

  const perms = PERMS[platform];

  return (
    <div className="space-y-3">
      <Alert className="text-xs">
        <KeyRound className="w-3.5 h-3.5" />
        <AlertTitle className="text-xs">{tx("Where to find the credentials", "Dove trovare le credenziali")}</AlertTitle>
        <AlertDescription className="text-xs">{tx(WHERE[platform].en, WHERE[platform].it)}</AlertDescription>
      </Alert>

      <Alert className="border-amber-500/40 bg-amber-500/5 [&>svg]:text-amber-500 text-xs">
        <ShieldCheck className="w-3.5 h-3.5" />
        <AlertTitle className="text-xs">{tx("Required permissions", "Permessi necessari")}</AlertTitle>
        <AlertDescription className="text-xs">
          <ul className="space-y-1.5 mt-1">
            {perms.map((row) => (
              <li key={row.label.en} className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span>
                  <span className="font-medium">{tx(row.label.en, row.label.it)}</span>
                  {" — "}
                  {tx(row.detail.en, row.detail.it)}
                </span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PlatformGuide;
