import { useState } from "react";
import { Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, CalendarCheck, ShoppingBag, Hotel, Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const { user, role, loading } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();
  const verticalParam = searchParams.get("vertical");
  const normalizedParam = verticalParam === "hospitality" ? "hotel" : verticalParam;
  const initialVertical = (["booking", "ecommerce", "hotel", "general"] as const).includes(
    normalizedParam as "booking" | "ecommerce" | "hotel" | "general"
  )
    ? (normalizedParam as "booking" | "ecommerce" | "hotel" | "general")
    : null;
  const [vertical, setVertical] = useState<"booking" | "ecommerce" | "hotel" | "general" | null>(initialVertical);

  if (!loading && user) {
    return <Navigate to={role === "super_admin" ? "/admin" : "/dashboard"} replace />;
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = t("registerMissingFields");
    if (!companyName.trim()) errs.companyName = t("registerMissingFields");
    if (!email.trim()) errs.email = t("registerMissingFields");
    if (password.length < 8) errs.password = t("passwordMinLength");
    if (password !== confirmPassword) errs.confirmPassword = t("passwordsMismatch");
    if (!acceptTerms) errs.terms = t("registerAcceptTerms");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-client", {
        body: { full_name: fullName, company_name: companyName, email, password, vertical },
      });

      if (error) throw error;

      if (data?.error === "email_exists") {
        setErrors({ email: t("registerEmailExists") });
        setIsLoading(false);
        return;
      }

      if (data?.error === "weak_password") {
        setErrors({
          password: lang === "it"
            ? "Questa password è troppo comune o compare in elenchi di password rubate. Scegline una diversa."
            : "This password is too common or appears in leaked password lists. Please choose a different one.",
        });
        setIsLoading(false);
        return;
      }

      if (data?.error) {
        toast({ title: t("loginFailed"), description: data.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({ title: t("loginFailed"), description: signInError.message, variant: "destructive" });
        navigate("/login");
      } else {
        toast({
          title: t("registerSuccessTitle"),
          description: t("registerSuccessDesc"),
        });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: t("loginFailed"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 md:p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 max-w-[120px] rounded-2xl bg-white shadow-lg mb-4">
            <img src="/images/genius-icon.png" alt="Genius" className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
            Genius <span className="text-gradient">Chatbot</span>
          </h1>
          <p className="text-muted-foreground mt-1">Builder Platform</p>
        </div>

        {!vertical ? (
          <div className="glass rounded-none md:rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {t("What kind of business do you have?", "Che tipo di attività hai?")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("Choose the option that fits best — we'll set up your chatbot accordingly.", "Scegli l'opzione più adatta: configureremo il chatbot di conseguenza.")}
            </p>

            <div className="space-y-3">
              {[
                {
                  key: "booking" as const,
                  Icon: CalendarCheck,
                  title: t("Bookings & Appointments", "Prenotazioni & Appuntamenti"),
                  subtitle: t("Clinics, dentists, physios, beauty & wellness centers", "Studi medici, dentisti, fisioterapisti, centri estetici e benessere"),
                },
                {
                  key: "ecommerce" as const,
                  Icon: ShoppingBag,
                  title: t("Ecommerce & Catalog", "Ecommerce & Catalogo"),
                  subtitle: t("Online store or catalog-only website, with product integration", "Negozio online o sito con solo catalogo, con integrazione prodotti"),
                },
                {
                  key: "hotel" as const,
                  Icon: Hotel,
                  title: t("Hotels & Hospitality", "Hotel & Ospitalità"),
                  subtitle: t("Rooms, services and property information from your website", "Camere, servizi e informazioni sulla struttura dal tuo sito"),
                },
                {
                  key: "general" as const,
                  Icon: Building2,
                  title: t("Business Website / Other", "Sito aziendale / Altro"),
                  subtitle: t("Professional firms, B2B companies, services, brochure sites", "Studi professionali, aziende B2B, servizi, siti vetrina"),
                },
              ].map(({ key, Icon, title, subtitle }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVertical(key)}
                  className="w-full text-left flex items-start gap-4 p-4 rounded-xl bg-secondary border border-border hover:border-primary hover:bg-secondary/70 transition-colors"
                >
                  <span className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</span>
                  </span>
                </button>
              ))}
            </div>

            <p className="text-center text-muted-foreground text-sm mt-6">
              {t("registerHasAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline">{t("signIn")}</Link>
            </p>
          </div>
        ) : (
        <div className="glass rounded-none md:rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {!initialVertical && <button
              type="button"
              onClick={() => setVertical(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Back", "Indietro")}
            </button>}
          <h2 className="text-xl font-semibold text-foreground mb-6">{t("registerTitle")}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-muted-foreground text-sm">{t("registerFullName")}</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" required className="bg-secondary border-border text-foreground h-12 text-base" />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-muted-foreground text-sm">{t("companyName")}</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme S.r.l." required className="bg-secondary border-border text-foreground h-12 text-base" />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">{t("emailAddress")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-secondary border-border text-foreground h-12 text-base" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">{t("password")}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-secondary border-border text-foreground h-12 text-base pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">{t("confirmPassword")}</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="bg-secondary border-border text-foreground h-12 text-base" />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                {t("registerAcceptTermsLabel")}{" "}
                <Link to="/terms" className="text-primary hover:underline">{t("registerTermsLink")}</Link>{" "}
                {t("registerAndLabel")}{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

            <Button type="submit" disabled={isLoading} className="w-full h-12 gradient-primary text-white font-semibold rounded-lg glow-sm hover:opacity-90 transition-opacity border-0">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("registerButton")}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-6">
            {t("registerHasAccount")}{" "}
            <Link to="/login" className="text-primary hover:underline">{t("signIn")}</Link>
          </p>
        </div>
        )}


        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Genius Chatbot Builder © 2026
        </p>
      </div>
    </div>
  );
};

export default Register;
