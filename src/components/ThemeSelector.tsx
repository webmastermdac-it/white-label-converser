import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  collapsed?: boolean;
}

const options = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

// Below this container width the labels are dropped and only the icons
// are shown (with aria-label/title), so the group never overflows.
const ICONS_ONLY_WIDTH = 176;

const ThemeSelector = ({ collapsed = false }: ThemeSelectorProps) => {
  const { theme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setNarrow(el.clientWidth < ICONS_ONLY_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (collapsed) {
    // Cycle through themes on click when collapsed
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    const Current = options.find((o) => o.value === theme)!.icon;
    return (
      <button
        onClick={() => setTheme(next)}
        className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        title={`Theme: ${theme}`}
      >
        <Current className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/60 w-full"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
            theme === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
          aria-label={`Theme: ${label}`}
          aria-pressed={theme === value}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {!narrow && <span className="truncate">{label}</span>}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
