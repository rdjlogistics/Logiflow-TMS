import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePurchaseInvoicePdf = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    setIsGenerating(true);
    
    try {
      toast.info("PDF wordt gegenereerd...");
      
      const { data, error } = await supabase.functions.invoke("generate-purchase-invoice-pdf", {
        body: { invoiceId },
      });

      if (error) {
        console.error("PDF generation error:", error);
        throw new Error(error.message || "PDF genereren mislukt");
      }

      if (!data?.pdf) {
        throw new Error("Geen PDF data ontvangen");
      }

      if (data.html) {
        // HTML-based: decode and open print dialog
        const binaryString = atob(data.pdf);
        const htmlContent = new TextDecoder().decode(
          new Uint8Array(Array.from(binaryString, c => c.charCodeAt(0)))
        );
        
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // Binary PDF base64
        const binaryString = atob(data.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `Inkoopfactuur-${invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
      }
      
      toast.success("PDF gegenereerd");
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast.error(err.message || "Kon PDF niet genereren");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadMultiplePdfs = async (
    invoices: Array<{ id: string; invoice_number: string }>
  ) => {
    setIsGenerating(true);
    let successCount = 0;

    toast.info(`${invoices.length} PDFs worden gegenereerd...`);

    for (const invoice of invoices) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-purchase-invoice-pdf", {
          body: { invoiceId: invoice.id },
        });

        if (!error && data?.pdf) {
          if (data.html) {
            const binaryString = atob(data.pdf);
            const htmlContent = new TextDecoder().decode(
              new Uint8Array(Array.from(binaryString, c => c.charCodeAt(0)))
            );
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(htmlContent);
              printWindow.document.close();
            }
          } else {
            const binaryString = atob(data.pdf);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = url;
            link.download = `Inkoopfactuur-${invoice.invoice_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
          }
          successCount++;
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`Failed to download PDF for ${invoice.invoice_number}:`, err);
      }
    }

    setIsGenerating(false);
    
    if (successCount === invoices.length) {
      toast.success(`${successCount} PDFs gegenereerd`);
    } else if (successCount > 0) {
      toast.warning(`${successCount} van ${invoices.length} PDFs gegenereerd`);
    } else {
      toast.error("Kon geen PDFs genereren");
    }
  };

  return {
    isGenerating,
    downloadPdf,
    downloadMultiplePdfs,
  };
};
