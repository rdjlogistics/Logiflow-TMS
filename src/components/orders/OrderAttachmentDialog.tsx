import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Loader2, X, File, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

const documentCategories = [
  { value: "vrachtbrief", label: "Vrachtbrief" },
  { value: "pod", label: "Proof of Delivery" },
  { value: "factuur", label: "Factuur" },
  { value: "foto", label: "Foto" },
  { value: "overig", label: "Overig" },
];

const OrderAttachmentDialog = ({ open, onOpenChange, orderId }: OrderAttachmentDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("overig");
  const [customName, setCustomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!customName) {
        setCustomName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Selecteer een bestand", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${orderId}/${Date.now()}-${customName || selectedFile.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("order-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket (1 year expiry for long-term access)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("order-documents")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (signedUrlError) throw signedUrlError;

      const documentUrl = signedUrlData?.signedUrl || fileName;

      // Save document reference - store the file path for future signed URL generation
      const { error: dbError } = await supabase.from("order_documents").insert({
        order_id: orderId,
        name: customName || selectedFile.name,
        document_type: documentType,
        url: fileName, // Store the file path, not the signed URL
        mime_type: selectedFile.type,
        file_size: selectedFile.size,
        is_public: isPublic,
      });

      if (dbError) throw dbError;

      // Log event
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "document_added",
        actor_user_id: userId,
        payload: { 
          document_type: documentType, 
          file_name: customName || selectedFile.name 
        },
      });

      toast({ title: "Document geüpload" });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Upload mislukt", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType("overig");
    setCustomName("");
    setIsPublic(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent
        variant="sheet"
        className="max-h-[min(88dvh,calc(100dvh-1rem))] sm:max-h-[min(85dvh,calc(100dvh-3rem))] sm:max-w-md flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Document bijvoegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto min-h-0 flex-1">
          {/* File upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
            
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); resetForm(); }}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Klik om een bestand te selecteren
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, afbeeldingen of Office documenten
                </p>
              </>
            )}
          </div>

          {/* Document type */}
          <div className="space-y-2">
            <Label>Documenttype</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom name */}
          <div className="space-y-2">
            <Label>Naam (optioneel)</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Eigen naam voor het document"
            />
          </div>

          {/* Public/Internal toggle */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-colors",
              isPublic
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-muted/30 border-border/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isPublic ? "bg-emerald-500/10" : "bg-muted"
              )}>
                {isPublic ? (
                  <Globe className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isPublic ? "Openbaar" : "Intern"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Deelbaar met klanten en charters"
                    : "Alleen zichtbaar voor medewerkers"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </motion.div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Uploaden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderAttachmentDialog;
