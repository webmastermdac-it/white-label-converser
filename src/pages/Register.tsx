import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bot, Eye, EyeOff, Loader2, CalendarCheck, ShoppingBag, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const { user, role, loading } = useAuth();
  const { t } = useLanguage();
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
  const [vertical, setVertical] = useState<"booking" | "ecommerce" | "hospitality" | null>(null);

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

        <div className="glass rounded-none md:rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Genius Chatbot Builder © 2026
        </p>
      </div>
    </div>
  );
};

export default Register;
