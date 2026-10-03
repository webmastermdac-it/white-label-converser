import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type AppLang } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export const PUBLIC_LANGUAGES: { value: AppLang; label: string }[] = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

/** Compact 6-language selector for public pages. */
export default function PublicLanguageSelect({ className }: { className?: string }) {
  const { contentLang, setLang, t } = useLanguage();
  const current = PUBLIC_LANGUAGES.find((l) => l.value === contentLang) ?? PUBLIC_LANGUAGES[1];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${t("Language", "Lingua")}: ${current.label}`}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full border border-current/20 px-2.5 text-xs font-semibold uppercase opacity-90 transition-colors hover:border-[#F5A623] hover:text-[#F5A623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]",
          className,
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {current.value}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-40">
        {PUBLIC_LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.value} lang={l.value} onSelect={() => setLang(l.value)} className="min-h-10 gap-2">
            <span className="w-6 text-xs font-semibold uppercase text-muted-foreground">{l.value}</span>
            <span>{l.label}</span>
            {contentLang === l.value && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
