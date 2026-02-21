import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Bot, LogOut, Menu, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  end?: boolean;
}

interface MobileNavProps {
  items: NavItem[];
  subtitle?: string;
}

const MobileNav: React.FC<MobileNavProps> = ({ items, subtitle }) => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Top bar - only on mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4 border-b border-sidebar-border" style={{ background: "hsl(var(--sidebar-background))" }}>
        <button onClick={() => setOpen(true)} className="w-10 h-10 flex items-center justify-center text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
            Genius <span className="text-gradient">Chatbot</span>
          </span>
        </div>
        <button onClick={handleSignOut} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Overlay menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col animate-slide-in-left" style={{ background: "hsl(var(--sidebar-background))" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Genius Chatbot</span>
                  {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                      isActive
                        ? "nav-item-active"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <button
                onClick={() => { setLang(lang === "it" ? "en" : "it"); }}
                className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
              >
                <Globe className="w-4 h-4" />
                {lang === "it" ? "🇮🇹 Italiano" : "🇬🇧 English"}
              </button>
              <p className="text-xs text-muted-foreground px-3 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
