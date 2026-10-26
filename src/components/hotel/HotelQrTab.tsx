import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Download, FileText, Plus, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage, tx } from "@/hooks/useLanguage";
import type { HotelProfile } from "@/lib/hotelProfile";

interface Props {
  profile: HotelProfile;
  embedToken: string;
  enabled: boolean;
  onChange: (next: HotelProfile) => void;
  onDownloaded: () => void;
  onUpgrade: () => void;
}

export const DEFAULT_QUICK_REPLIES = ["Pulizia/asciugamani", "Late check-out", "Taxi/transfer", "Ristorante", "Problema in camera", "Altro"];

const HotelQrTab = ({ profile, embedToken, enabled, onChange, onDownloaded, onUpgrade }: Props) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => tx(en, it);
  const [roomsText, setRoomsText] = useState("101-120");
  const [busy, setBusy] = useState(false);
  const replies = profile.in_stay_quick_replies.length ? profile.in_stay_quick_replies : DEFAULT_QUICK_REPLIES;
  const baseUrl = `${window.location.origin}/c/${embedToken}`;

  const rooms = useMemo(() => parseRooms(roomsText), [roomsText]);
  const linkFor = (room?: string) => room ? `${baseUrl}?room=${encodeURIComponent(room)}` : baseUrl;

  const updateReplies = (next: string[]) => onChange({ ...profile, in_stay_quick_replies: next });
  const markDownloaded = () => { onDownloaded(); };
  const downloadPng = async (room?: string) => {
    setBusy(true);
    const dataUrl = await QRCode.toDataURL(linkFor(room), { width: 1200, margin: 2, errorCorrectionLevel: "H" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `concierge-${room ? `camera-${room}` : "generale"}.png`;
    a.click();
    markDownloaded();
    setBusy(false);
  };
  const downloadPdf = async () => {
    if (!rooms.length) return;
    setBusy(true);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    for (let i = 0; i < rooms.length; i++) {
      if (i > 0 && i % 4 === 0) pdf.addPage();
      const slot = i % 4;
      const x = slot % 2 === 0 ? 12 : 109;
      const y = slot < 2 ? 12 : 153;
      const qr = await QRCode.toDataURL(linkFor(rooms[i]), { width: 600, margin: 1, errorCorrectionLevel: "H" });
      pdf.roundedRect(x, y, 89, 132, 3, 3);
      pdf.setFontSize(15); pdf.text(profile.property.name || "Concierge", x + 44.5, y + 13, { align: "center" });
      pdf.addImage(qr, "PNG", x + 17, y + 21, 55, 55);
      pdf.setFontSize(18); pdf.text(`${tl("Camera", "Room")} ${rooms[i]}`, x + 44.5, y + 87, { align: "center" });
      pdf.setFontSize(12); pdf.text("Scansiona: concierge 24/7", x + 44.5, y + 101, { align: "center" });
      pdf.text("Scan: 24/7 concierge", x + 44.5, y + 109, { align: "center" });
    }
    pdf.save("concierge-qr-camere.pdf");
    markDownloaded();
    setBusy(false);
  };

  if (!enabled) return (
    <div className="glass rounded-lg p-8 text-center space-y-4">
      <QrCode className="w-10 h-10 mx-auto text-primary" />
      <div><h2 className="text-lg font-semibold text-foreground">{tl("Disponibile nel piano Pro", "Available on the Pro plan")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{tl("Attiva QR per camera e richieste rapide degli ospiti.", "Enable room QR codes and quick guest requests.")}</p></div>
      <Button onClick={onUpgrade}>{tl("Passa a Pro", "Upgrade to Pro")}</Button>
    </div>
  );

  return <div className="space-y-4">
    <section className="glass rounded-lg p-4 md:p-5 space-y-4">
      <div><h2 className="font-semibold text-foreground">{tl("Azioni rapide in soggiorno", "In-stay quick actions")}</h2>
      <p className="text-sm text-muted-foreground">{tl("Personalizza le richieste mostrate agli ospiti sopra il campo messaggio.", "Customize the requests shown above the guest message field.")}</p></div>
      <div className="space-y-2">
        {replies.map((reply, index) => <div key={`${index}-${reply}`} className="flex gap-2">
          <Input value={reply} maxLength={80} onChange={(e) => updateReplies(replies.map((x, i) => i === index ? e.target.value : x))} />
          <Button type="button" size="icon" variant="ghost" title={tl("Elimina", "Delete")} onClick={() => updateReplies(replies.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>)}
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => updateReplies([...replies, tl("Nuova richiesta", "New request")])}><Plus className="w-4 h-4" />{tl("Aggiungi azione", "Add action")}</Button>
    </section>

    <section className="glass rounded-lg p-4 md:p-5 space-y-4">
      <div><h2 className="font-semibold text-foreground">{tl("QR generale", "General QR")}</h2><p className="text-sm text-muted-foreground break-all">{baseUrl}</p></div>
      <Button variant="outline" className="gap-2" disabled={busy} onClick={() => downloadPng()}><Download className="w-4 h-4" />{tl("Scarica PNG", "Download PNG")}</Button>
    </section>

    <section className="glass rounded-lg p-4 md:p-5 space-y-4">
      <div><h2 className="font-semibold text-foreground">{tl("QR per camera", "Room QR codes")}</h2><p className="text-sm text-muted-foreground">{tl("Inserisci un intervallo o camere separate da virgole.", "Enter a range or comma-separated room numbers.")}</p></div>
      <div className="space-y-1.5"><Label>{tl("Camere", "Rooms")}</Label><Input value={roomsText} onChange={(e) => setRoomsText(e.target.value)} placeholder="101-120, 201, 202" /></div>
      <p className="text-xs text-muted-foreground">{rooms.length ? `${rooms.length} ${tl("camere pronte", "rooms ready")}` : tl("Nessuna camera valida", "No valid rooms")}</p>
      <div className="flex flex-wrap gap-2">
        {rooms.slice(0, 12).map((room) => <Button key={room} size="sm" variant="outline" disabled={busy} onClick={() => downloadPng(room)}><Download className="w-3.5 h-3.5 mr-1" />{room}</Button>)}
      </div>
      <Button className="gap-2" disabled={busy || !rooms.length} onClick={downloadPdf}><FileText className="w-4 h-4" />{tl("Scarica PDF A4 stampabile", "Download printable A4 PDF")}</Button>
    </section>
  </div>;
};

function parseRooms(value: string): string[] {
  const result: string[] = [];
  for (const part of value.split(",").map((x) => x.trim()).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      const start = Number(range[1]), end = Number(range[2]);
      if (end >= start && end - start <= 199) for (let n = start; n <= end; n++) result.push(String(n));
    } else if (/^[\w -]{1,40}$/.test(part)) result.push(part);
  }
  return [...new Set(result)].slice(0, 200);
}

export default HotelQrTab;