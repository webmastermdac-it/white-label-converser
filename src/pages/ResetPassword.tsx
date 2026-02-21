import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 glow-primary">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
            Genius <span className="text-gradient">Chatbot</span>
          </h1>
        </div>

        <div className="glass rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-semibold text-foreground mb-6">{t("resetPasswordTitle")}</h2>

          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-muted-foreground">{t("resetEmailSent")}</p>
            </div>
          ) : (
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
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 gradient-primary text-white font-semibold rounded-lg glow-sm hover:opacity-90 transition-opacity border-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sendResetLink")}
              </Button>
            </form>
          )}

          <Link to="/login" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mt-6 justify-center">
            <ArrowLeft className="w-4 h-4" /> {t("backToLogin")}
          </Link>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Genius Chatbot Builder © 2025
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
