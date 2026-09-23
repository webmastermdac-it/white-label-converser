import { useLanguage } from "@/hooks/useLanguage";
import { Building2, ConciergeBell } from "lucide-react";

const HotelPlaceholder = ({ kind }: { kind: "profile" | "requests" }) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const Icon = kind === "profile" ? Building2 : ConciergeBell;
  const title = kind === "profile" ? tl("Profilo struttura", "Property profile") : tl("Richieste ospiti", "Guest requests");
  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{title}</h1>
      <div className="glass rounded-xl p-10 text-center space-y-2">
        <Icon className="w-8 h-8 mx-auto text-primary" />
        <p className="text-foreground font-medium">{tl("In arrivo", "Coming soon")}</p>
        <p className="text-sm text-muted-foreground">{tl("Questa sezione sarà disponibile a breve.", "This section will be available soon.")}</p>
      </div>
    </div>
  );
};

export default HotelPlaceholder;
