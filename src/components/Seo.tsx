import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://chatbot.your-genius.com";

interface SeoProps { title: string; description?: string; path?: string; noindex?: boolean; }

export default function Seo({ title, description, path = "/", noindex = false }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
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
