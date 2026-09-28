import { Check, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type AppLang } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const LANGUAGES: { value: AppLang; flag: string; label: string }[] = [
  { value: "it", flag: "🇮🇹", label: "Italiano" },
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "de", flag: "🇩🇪", label: "Deutsch" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
  { value: "es", flag: "🇪🇸", label: "Español" },
];

interface LanguageMenuProps {
  collapsed?: boolean;
  large?: boolean;
}

const LanguageMenu = ({ collapsed = false, large = false }: LanguageMenuProps) => {
  const { contentLang, setLang } = useLanguage();
  const current = LANGUAGES.find((language) => language.value === contentLang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Lingua: ${current.label}`}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center px-0" : "justify-start gap-2 px-3",
            large ? "min-h-11 text-sm" : "h-9 text-xs",
          )}
        >
          {!collapsed && <Globe className="w-4 h-4 shrink-0" />}
          <span className="shrink-0" aria-hidden="true">{current.flag}</span>
          {!collapsed && (
            <>
              <span className="truncate">{current.label}</span>
              <ChevronDown className="ml-auto w-3.5 h-3.5 shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-48">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.value}
            onSelect={() => setLang(language.value)}
            className="gap-2"
          >
            <span aria-hidden="true">{language.flag}</span>
            <span>{language.label}</span>
            {contentLang === language.value && <Check className="ml-auto w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageMenu;