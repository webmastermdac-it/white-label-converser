import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KBDocument } from "./types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Upload, FileText, Trash2, Loader2, AlertCircle } from "lucide-react";

interface Props {
  clientId: string;
  documents: KBDocument[];
  onChange: (docs: KBDocument[]) => void;
}

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const DocumentUpload: React.FC<Props> = ({ clientId, documents, onChange }) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (documents.length >= MAX_FILES) {
      toast({ title: t("Limit reached", "Limite raggiunto"), description: t(`Maximum ${MAX_FILES} files.`, `Massimo ${MAX_FILES} file.`), variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: t("File too large", "File troppo grande"), description: t("Max 5MB per file.", "Max 5MB per file."), variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext || "")) {
      toast({ title: t("Unsupported format", "Formato non supportato"), description: t("Only PDF and DOCX.", "Solo PDF e DOCX."), variant: "destructive" });
      return;
    }

    const docId = crypto.randomUUID();
    const storagePath = `${clientId}/${docId}-${file.name}`;

    const newDoc: KBDocument = {
      id: docId,
      filename: file.name,
      size: file.size,
      status: "processing",
      extractedText: "",
      storagePath,
    };

    const updated = [...documents, newDoc];
    onChange(updated);
    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("kb-documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: { storagePath, filename: file.name },
      });

      if (error) throw error;

      const finalDoc: KBDocument = {
        ...newDoc,
        status: "ready",
        extractedText: data?.text || t("(No text extracted)", "(Nessun testo estratto)"),
      };

      onChange(updated.map((d) => (d.id === docId ? finalDoc : d)));
      toast({ title: t("Document processed", "Documento elaborato"), description: file.name });
    } catch (err: any) {
      onChange(
        updated.map((d) =>
          d.id === docId ? { ...d, status: "error" as const } : d
        )
      );
      toast({ title: t("Error", "Errore"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (doc: KBDocument) => {
    await supabase.storage.from("kb-documents").remove([doc.storagePath]);
    onChange(documents.filter((d) => d.id !== doc.id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(processFile);
    },
    [documents]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          {t("Drag files here or click to upload", "Trascina qui i tuoi file PDF o DOCX")}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {t(`Max ${MAX_FILES} files, 5MB each`, `Max ${MAX_FILES} file, 5MB ciascuno`)}
        </p>
        <label>
          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <Button variant="outline" size="sm" asChild>
            <span>{t("Select Files", "Seleziona File")}</span>
          </Button>
        </label>
      </div>

      {/* File list */}
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-start gap-3 p-4 rounded-xl bg-secondary border border-border"
        >
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {doc.filename}
            </p>
            <p className="text-xs text-muted-foreground">
              {(doc.size / 1024).toFixed(0)} KB
            </p>

            {doc.status === "processing" && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("Processing...", "Elaborazione in corso...")}
              </div>
            )}
            {doc.status === "error" && (
              <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {t("Error processing file", "Errore nell'elaborazione")}
              </div>
            )}
            {doc.status === "ready" && doc.extractedText && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-3 bg-background p-2 rounded">
                {doc.extractedText.slice(0, 500)}
                {doc.extractedText.length > 500 ? "..." : ""}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeDoc(doc)}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default DocumentUpload;
