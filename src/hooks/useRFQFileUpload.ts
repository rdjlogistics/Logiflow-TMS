import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

interface UploadResult {
  fileUrl: string;
  rfqId: string;
}

export const useRFQFileUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      if (!company?.id) {
        throw new Error("Geen bedrijf gevonden");
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "message/rfc822", // .eml
        "text/plain",
      ];
      
      const allowedExtensions = [".pdf", ".doc", ".docx", ".eml", ".msg", ".txt"];
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        throw new Error("Ongeldig bestandstype. Alleen PDF, Word, e-mail en tekst bestanden zijn toegestaan.");
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("Bestand is te groot. Maximum is 10MB.");
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .substring(0, 100);
      const filePath = `${company.id}/${timestamp}_${sanitizedName}`;

      // Upload to storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("rfq-documents")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload mislukt: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("rfq-documents")
        .getPublicUrl(uploadData.path);

      const fileUrl = urlData.publicUrl;

      // Create RFQ message record with file reference
      const { data: rfqData, error: rfqError } = await supabase
        .from("rfq_messages")
        .insert({
          tenant_id: company.id,
          source: "FILE_UPLOAD",
          subject: file.name.replace(/\.[^/.]+$/, ""),
          body_text: `Geüpload bestand: ${file.name}\nGrootte: ${(file.size / 1024).toFixed(1)} KB\nType: ${file.type || fileExtension}`,
          sender_email: null,
          attachment_urls: [fileUrl],
          status: "NEW",
        })
        .select()
        .single();

      if (rfqError) {
        // Clean up uploaded file if RFQ creation fails
        await supabase.storage.from("rfq-documents").remove([filePath]);
        throw new Error(`RFQ aanmaken mislukt: ${rfqError.message}`);
      }

      return {
        fileUrl,
        rfqId: rfqData.id,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-messages"] });
      queryClient.invalidateQueries({ queryKey: ["charter-growth"] });
      toast({
        title: "Bestand geüpload",
        description: "De RFQ is succesvol toegevoegd aan de inbox.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export default useRFQFileUpload;
