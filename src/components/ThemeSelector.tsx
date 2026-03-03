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

const ThemeSelector = ({ collapsed = false }: ThemeSelectorProps) => {
  const { theme, setTheme } = useTheme();

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
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/60 w-full">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            theme === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
