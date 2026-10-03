import { Helmet } from "react-helmet-async";
import { useLanguage, type AppLang } from "@/hooks/useLanguage";

const OG_LOCALES: Record<AppLang, string> = { it: "it_IT", en: "en_US", fr: "fr_FR", de: "de_DE", es: "es_ES", pt: "pt_PT" };

export const SITE_URL = "https://chatbot.your-genius.com";

interface SeoProps { title: string; description?: string; path?: string; noindex?: boolean; }

export default function Seo({ title, description, path = "/", noindex = false }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const { contentLang } = useLanguage();
  return (
    <Helmet htmlAttributes={{ lang: contentLang }}>
      <meta property="og:locale" content={OG_LOCALES[contentLang]} />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
