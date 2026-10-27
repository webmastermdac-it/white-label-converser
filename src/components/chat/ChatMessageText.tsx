import { Fragment, type ReactNode } from "react";

/** Internal markers the bot appends for the widget; never show them to people reading a transcript. */
const MARKERS = /\[(?:SERVICE_REQUEST|LEAD_DATA|STAY_SUMMARY):\{[\s\S]*?\}\]|\[TRIGGER_LEAD_FORM\]/g;
const INLINE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s<>()]+)/g;

const shortUrl = (url: string) => {
  try { const u = new URL(url); const path = u.pathname === "/" ? "" : u.pathname; const s = u.host + path; return s.length > 48 ? s.slice(0, 45) + "…" : s; }
  catch { return url.length > 48 ? url.slice(0, 45) + "…" : url; }
};
const trimTrailing = (url: string) => url.replace(/[.,;:!?]+$/, "");

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, n = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyBase}-${n++}`;
    if (m[2]) {
      out.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="block my-1">
        <img src={m[2]} alt={m[1] || ""} loading="lazy" className="max-h-40 max-w-full rounded-lg object-cover" />
      </a>);
    } else if (m[4]) {
      out.push(<a key={key} href={m[4]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-words">{m[3]}</a>);
    } else if (m[5]) {
      out.push(<strong key={key}>{m[5]}</strong>);
    } else if (m[6]) {
      const url = trimTrailing(m[6]);
      out.push(<a key={key} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">{shortUrl(url)}</a>);
      if (url.length < m[6].length) out.push(m[6].slice(url.length));
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Text of one chat message, rendered safely (no HTML injection) and kept inside its bubble. */
export default function ChatMessageText({ content }: { content: unknown }) {
  const text = String(content ?? "").replace(MARKERS, "").trim();
  const lines = text.split("\n");
  return (
    <div className="min-w-0 max-w-full space-y-1 [overflow-wrap:anywhere]">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" aria-hidden="true" />;
        const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
        return bullet
          ? <div key={i} className="flex gap-2"><span aria-hidden="true">•</span><span className="min-w-0">{inline(bullet[1], `l${i}`)}</span></div>
          : <p key={i}><Fragment>{inline(line, `l${i}`)}</Fragment></p>;
      })}
    </div>
  );
}
