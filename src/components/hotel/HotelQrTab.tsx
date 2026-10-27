import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Download, FileText, Plus, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tx } from "@/hooks/useLanguage";
import type { HotelProfile } from "@/lib/hotelProfile";

interface Props {
  profile: HotelProfile;
  embedToken: string;
  enabled: boolean;
  onChange: (next: HotelProfile) => void;
  onDownloaded: () => void;
  onUpgrade: () => void;
}

const DEFAULT_QR_ROOMS = "101-120";
export const DEFAULT_QUICK_REPLIES = ["Pulizia/asciugamani", "Late check-out", "Taxi/transfer", "Ristorante", "Problema in camera", "Altro"];

const HotelQrTab = ({ profile, embedToken, enabled, onChange, onDownloaded, onUpgrade }: Props) => {
  const tl = (it: string, en: string) => tx(en, it);
  const roomsText = profile.qr_rooms || DEFAULT_QR_ROOMS;
  const setRoomsText = (value: string) => onChange({ ...profile, qr_rooms: value });
  const [busy, setBusy] = useState(false);
  const replies = profile.in_stay_quick_replies.length ? profile.in_stay_quick_replies : DEFAULT_QUICK_REPLIES;
  const baseUrl = `${window.location.origin}/c/${embedToken}`;

  const rooms = useMemo(() => parseRooms(roomsText), [roomsText]);
  const linkFor = (room?: string) => room ? `${baseUrl}?room=${encodeURIComponent(room)}` : baseUrl;

  const updateReplies = (next: string[]) => onChange({ ...profile, in_stay_quick_replies: next });
  const markDownloaded = () => { onDownloaded(); };
  const downloadPng = async (room?: string) => {
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = room ? 1500 : 1380;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setBusy(false); return; }
    const font = '"Poppins", Helvetica, Arial, sans-serif';
    const hotelName = (profile.property.name || "Concierge").toUpperCase();
    const roomLabel = `${tx("Room", "Camera")} ${room || ""}`;
    const left = 16, top = 16, right = 1184, bottom = canvas.height - 16, radius = 36;
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(right - radius, top);
    ctx.quadraticCurveTo(right, top, right, top + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(left + radius, bottom);
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    ctx.fillStyle = "#FCFAF5";
    ctx.fill();
    ctx.strokeStyle = "#E5DFD0";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#B7862B";
    ctx.textBaseline = "middle";
    let nameSize = 32;
    const letters = Array.from(hotelName);
    const spacing = 5;
    ctx.font = `500 ${nameSize}px ${font}`;
    const nameWidth = () => letters.reduce((sum, letter) => sum + ctx.measureText(letter).width, 0) + Math.max(0, letters.length - 1) * spacing;
    while (nameWidth() > 1000 && nameSize > 12) {
      nameSize -= 1;
      ctx.font = `500 ${nameSize}px ${font}`;
    }
    // Scale exceptionally long property names without clipping their lettering.
    ctx.save();
    ctx.translate(600, 135);
    ctx.scale(Math.min(1, 1000 / Math.max(1, nameWidth())), 1);
    let letterX = -nameWidth() / 2;
    for (const letter of letters) {
      ctx.fillText(letter, letterX, 0);
      letterX += ctx.measureText(letter).width + spacing;
    }
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = "#12302B";
    if (room) {
      ctx.font = `bold 56px ${font}`;
      ctx.fillText(roomLabel, 600, 240, 1000);
    }
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, linkFor(room), {
      width: 850, margin: 2, errorCorrectionLevel: "H",
      color: { dark: "#12302B", light: "#00000000" },
    });
    const qrY = room ? 330 : 210;
    ctx.drawImage(qrCanvas, 175, qrY, 850, 850);
    ctx.font = `500 40px ${font}`;
    ctx.fillText("Inquadra e scrivi al concierge", 600, qrY + 940, 1000);
    ctx.fillStyle = "#777777";
    ctx.font = `400 30px ${font}`;
    ctx.fillText("Scan and chat with the concierge", 600, qrY + 1000, 1000);
    const dataUrl = canvas.toDataURL("image/png");
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
      const qr = await QRCode.toDataURL(linkFor(rooms[i]), {
        width: 600, margin: 1, errorCorrectionLevel: "H",
        color: { dark: "#12302B", light: "#00000000" },
      });
      pdf.setFillColor("#FCFAF5");
      pdf.setDrawColor("#E5DFD0");
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, 89, 132, 3, 3, "FD");
      const hotelName = (profile.property.name || "Concierge").toUpperCase();
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor("#B7862B");
      let nameSize = 9;
      let charSpace = 1.2;
      pdf.setFontSize(nameSize);
      const nameWidth = () => pdf.getTextWidth(hotelName) + Math.max(0, hotelName.length - 1) * charSpace * 25.4 / 72;
      while (nameWidth() > 73 && nameSize > 5) {
        nameSize -= 0.5;
        pdf.setFontSize(nameSize);
      }
      if (nameWidth() > 73) {
        const scale = 73 / nameWidth();
        nameSize *= scale;
        charSpace *= scale;
        pdf.setFontSize(nameSize);
      }
      pdf.text(hotelName, x + 44.5, y + 15, { align: "center", charSpace });
      pdf.setCharSpace(0);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor("#12302B");
      const roomLabel = `${tx("Room", "Camera")} ${rooms[i]}`;
      pdf.setFontSize(18);
      if (pdf.getTextWidth(roomLabel) > 73) pdf.setFontSize(18 * 73 / pdf.getTextWidth(roomLabel));
      pdf.text(roomLabel, x + 44.5, y + 29, { align: "center" });
      pdf.addImage(qr, "PNG", x + 17, y + 39, 55, 55);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Inquadra e scrivi al concierge", x + 44.5, y + 108, { align: "center" });
      pdf.setTextColor("#777777");
      pdf.setFontSize(8.5);
      pdf.text("Scan and chat with the concierge", x + 44.5, y + 117, { align: "center" });
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