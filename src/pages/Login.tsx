import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bot, Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const { user, role, signIn, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!loading && user) {
    return <Navigate to={role === "super_admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: t("loginFailed"), description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 md:p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 max-w-[120px] rounded-2xl gradient-primary mb-4 glow-primary">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
            Genius <span className="text-gradient">Chatbot</span>
          </h1>
          <p className="text-muted-foreground mt-1">Builder Platform</p>
        </div>

        <div className="glass rounded-none md:rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-semibold text-foreground mb-6">{t("signInTitle")}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">{t("emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 text-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/reset-password" className="text-sm text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gradient-primary text-white font-semibold rounded-lg glow-sm hover:opacity-90 transition-opacity border-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signIn")}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-6">
            {t("registerNoAccount")}{" "}
            <Link to="/register" className="text-primary hover:underline">{t("registerFreeLink")}</Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Genius Chatbot Builder © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;
