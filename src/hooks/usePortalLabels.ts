import { useState } from 'react';
import { toast } from 'sonner';
// jsPDF dynamically imported when needed

interface Shipment {
  id: string;
  referenceNumber: string;
  trackingCode?: string;
  fromAddress: string;
  fromCity: string;
  toAddress: string;
  toCity: string;
  carrier?: string;
}

export function usePortalLabels() {
  const [generating, setGenerating] = useState(false);

  const generateLabelPDF = async (shipments: Shipment[]): Promise<Blob | null> => {
    if (shipments.length === 0) return null;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: [100, 150] });

    shipments.forEach((shipment, index) => {
      if (index > 0) doc.addPage([100, 150]);

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(shipment.carrier || 'LogiFlow', 10, 15);
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(5, 20, 95, 20);

      // Tracking / barcode area
      const code = shipment.trackingCode || shipment.referenceNumber;
      doc.setFillColor(240, 240, 240);
      doc.rect(5, 25, 90, 12, 'F');
      doc.setFontSize(12);
      doc.setFont('courier', 'normal');
      doc.text(code, 50, 33, { align: 'center' });

      // Barcode simulation (Code128-style bars)
      doc.setFontSize(28);
      doc.setFont('courier', 'bold');
      doc.text('|||||||||||||||||||||||', 50, 50, { align: 'center' });

      // From address
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(5, 58, 90, 28);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('VAN (AFZENDER)', 8, 64);
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(shipment.fromAddress, 8, 71);
      doc.text(shipment.fromCity, 8, 77);

      // To address
      doc.rect(5, 90, 90, 35);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('NAAR (ONTVANGER)', 8, 96);
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(shipment.toAddress, 8, 105);
      doc.text(shipment.toCity, 8, 113);

      // Reference footer
      doc.setDrawColor(200);
      doc.line(5, 135, 95, 135);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Ref: ${shipment.referenceNumber}`, 8, 142);
      doc.setTextColor(0);
    });

    return doc.output('blob');
  };

  const generateZPL = (shipments: Shipment[]): string => {
    return shipments.map(shipment => `
^XA
^FO50,50^A0N,40,40^FD${shipment.carrier || 'LogiFlow'}^FS
^FO50,100^BY3^BCN,100,Y,N,N^FD${shipment.trackingCode || shipment.referenceNumber}^FS
^FO50,230^A0N,25,25^FDVAN:^FS
^FO50,260^A0N,30,30^FD${shipment.fromCity}^FS
^FO50,310^A0N,25,25^FDNAAR:^FS
^FO50,340^A0N,40,40^FD${shipment.toCity}^FS
^FO50,420^A0N,20,20^FDRef: ${shipment.referenceNumber}^FS
^XZ
    `).join('\n');
  };

  const downloadLabels = async (
    shipments: Shipment[], 
    format: 'pdf' | 'zpl'
  ): Promise<boolean> => {
    if (shipments.length === 0) {
      toast.error('Selecteer eerst labels om te downloaden');
      return false;
    }

    setGenerating(true);
    
    try {
      if (format === 'zpl') {
        const zpl = generateZPL(shipments);
        const blob = new Blob([zpl], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `labels_${new Date().toISOString().split('T')[0]}.zpl`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${shipments.length} ZPL label(s) gedownload`);
      } else {
        const blob = await generateLabelPDF(shipments);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `labels_${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`${shipments.length} label(s) gedownload als PDF`);
        }
      }
      return true;
    } catch (error) {
      console.error('Error generating labels:', error);
      toast.error('Fout bij genereren labels');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const printLabels = async (shipments: Shipment[]): Promise<boolean> => {
    if (shipments.length === 0) {
      toast.error('Selecteer eerst labels om te printen');
      return false;
    }

    setGenerating(true);
    
    try {
      const blob = generateLabelPDF(shipments);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        document.body.appendChild(iframe);
        iframe.src = url;
        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
        };
        toast.success(`${shipments.length} label(s) worden afgedrukt`);
      }
      return true;
    } catch (error) {
      console.error('Error printing labels:', error);
      toast.error('Fout bij printen labels');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generating,
    downloadLabels,
    printLabels,
    generateZPL,
  };
}
