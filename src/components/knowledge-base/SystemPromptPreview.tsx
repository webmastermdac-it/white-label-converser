import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  prompt: string;
  onConfirm: (prompt: string) => void;
}

const SystemPromptPreview: React.FC<Props> = ({ open, onClose, prompt, onConfirm }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>System Prompt Preview</DialogTitle>
          <DialogDescription>
            Questo è il prompt di sistema generato che verrà usato dal tuo chatbot.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={prompt}
          readOnly
          rows={20}
          className="flex-1 bg-secondary border-border resize-none font-mono text-xs"
        />

        <div className="flex justify-between pt-2">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? "Copiato!" : "Copia"}
          </Button>
          <Button
            onClick={() => {
              onConfirm(prompt);
              onClose();
            }}
            className="gradient-primary text-white border-0"
          >
            Salva come System Prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SystemPromptPreview;
