import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminClientFilter, AdminClient } from "@/contexts/AdminClientFilterContext";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const PLAN_ORDER: { key: string; label: string }[] = [
  { key: "pro", label: "Pro" },
  { key: "starter", label: "Starter" },
  { key: "free", label: "Free" },
];

const AccountSwitcher = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { selectedClientId, setSelectedClientId, selectedClient, clients } = useAdminClientFilter();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allLabel = tx("All accounts", "Tutti gli account");
  const currentLabel = selectedClient?.name || allLabel;
  const initial = (selectedClient?.name || allLabel).charAt(0).toUpperCase();

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = clients.filter((c) => c.name.toLowerCase().includes(q));
    return PLAN_ORDER.map(({ key, label }) => ({
      label,
      items: filtered
        .filter((c) => (c.plan || "free").toLowerCase() === key)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [clients, query]);

  const select = (id: string) => {
    setSelectedClientId(id);
    setOpen(false);
    setQuery("");
  };

  const trigger = (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition-colors w-full",
        collapsed ? "justify-center p-2" : "px-2.5 py-2"
      )}
      aria-label={allLabel}
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
        {selectedClient ? initial : <Users className="w-3.5 h-3.5" />}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs font-medium text-foreground truncate">{currentLabel}</span>
            <span className="block text-[10px] text-muted-foreground truncate capitalize">
              {selectedClient ? selectedClient.plan : tx("Aggregated view", "Vista aggregata")}
            </span>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        </>
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {collapsed ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
              <TooltipContent side="right">{currentLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          trigger
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side={collapsed ? "right" : "bottom"} className="w-64 p-0 bg-card border-border">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx("Search accounts...", "Cerca account...")}
              className="pl-8 h-8 text-xs bg-secondary border-border"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          <button
            onClick={() => select("all")}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 font-medium text-foreground">{allLabel}</span>
            {selectedClientId === "all" && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>

          {grouped.map((group) => (
            <div key={group.label} className="mt-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((c: AdminClient) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-foreground">{c.name}</span>
                  {selectedClientId === c.id && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          ))}

          {grouped.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              {tx("No accounts found", "Nessun account trovato")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AccountSwitcher;
