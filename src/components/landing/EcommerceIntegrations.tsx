import { Braces, FileCode, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import {
  siBigcommerce,
  siPrestashop,
  siShopify,
  siShopware,
  siWix,
  siWoocommerce,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

type LogoCardProps = {
  name: string;
  icon?: SimpleIcon;
  native?: boolean;
  nativeLabel?: string;
  fallbackIcon?: typeof FileCode;
};

const LogoCard = ({ name, icon, native, nativeLabel, fallbackIcon: FallbackIcon }: LogoCardProps) => (
  <article className={`group flex min-h-32 flex-col items-center justify-center rounded-xl border bg-white/[0.03] p-4 transition-colors ${native ? "border-[#F5A623]/40 hover:border-[#F5A623]/70" : "border-white/10 hover:border-white/25"}`}>
    {icon ? (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 fill-white/70 transition-colors group-hover:fill-white">
        <path d={icon.path} />
      </svg>
    ) : FallbackIcon ? (
      <FallbackIcon aria-hidden="true" className="h-9 w-9 text-white/70 transition-colors group-hover:text-white" />
    ) : (
      <span className="text-lg font-bold text-white/70 transition-colors group-hover:text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{name}</span>
    )}
    <h3 className="mt-3 text-sm font-semibold text-white/80">{name}</h3>
    {native && <span className="mt-2 rounded-full bg-[#F5A623]/15 px-2.5 py-1 text-[10px] font-semibold text-[#F5A623]">{nativeLabel}</span>}
  </article>
);

export default function EcommerceIntegrations() {
  const { t } = useLanguage();
  const nativeConnectors = [
    { name: "WooCommerce", icon: siWoocommerce },
    { name: "Shopify", icon: siShopify },
    { name: "PrestaShop", icon: siPrestashop },
  ];
  const compatiblePlatforms = [
    { name: "Magento" },
    { name: "BigCommerce", icon: siBigcommerce },
    { name: "Wix", icon: siWix },
    { name: "Shopware", icon: siShopware },
    { name: "OpenCart" },
  ];

  return (
    <div className="mt-6 text-left">
      <p className="mx-auto max-w-3xl text-center leading-relaxed text-white/55">
        {t(
          "Dedicated connectors for the main platforms. For every other platform and custom catalogs, import an XML/CSV feed or use the API.",
          "Connettori dedicati per le piattaforme principali. Per tutte le altre e per i cataloghi custom, importi un feed XML/CSV o usi le API.",
        )}
      </p>

      <div className="mt-10">
        <p className="mb-4 text-xs font-semibold uppercase text-[#F5A623]">{t("Dedicated connectors", "Connettori dedicati")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {nativeConnectors.map((platform) => <LogoCard key={platform.name} {...platform} native nativeLabel={t("Native connector", "Connettore nativo")} />)}
        </div>
      </div>

      <div className="mt-9">
        <p className="mb-4 text-xs font-semibold uppercase text-white/50">{t("Compatible via XML/CSV feed or API", "Compatibili tramite feed XML/CSV o API")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {compatiblePlatforms.map((platform) => <LogoCard key={platform.name} {...platform} />)}
          <LogoCard name="Feed XML/CSV" fallbackIcon={FileCode} />
          <LogoCard name={t("Custom catalog / API", "Catalogo custom / API")} fallbackIcon={Braces} />
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-white/35">{t("Logos and trademarks belong to their respective owners.", "Loghi e marchi appartengono ai rispettivi proprietari.")}</p>

      <div className="mt-10 grid items-center gap-6 rounded-2xl border border-dashed border-[#F5A623]/40 bg-white/[0.03] p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5A623]/15 text-[#F5A623]"><Wrench className="h-5 w-5" /></span>
            <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Don't want to deal with it? We'll set it up for you", "Non vuoi pensarci tu? Ti configuriamo noi")}</h3>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">{t("Store or feed connection, chatbot configuration and testing together with our team.", "Collegamento dello store o del feed, configurazione e test del chatbot insieme al nostro team.")}</p>
          <p className="mt-3 font-semibold text-[#F5A623]">{t("€500 + VAT, one-off", "€500 + IVA, una tantum")}</p>
        </div>
        <Link to="/setup-assistito">
          <Button className="w-full rounded-full bg-[#F5A623] px-6 text-black hover:bg-[#E09800]">{t("Discover the professional setup", "Scopri il Setup professionale")}</Button>
        </Link>
      </div>
    </div>
  );
}