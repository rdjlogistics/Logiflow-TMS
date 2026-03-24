// Dynamic imports — jsPDF + autoTable loaded only when user generates a PDF

interface PdfStop {
  id: string;
  address: string;
  city: string;
  timeWindow: string;
  priority: string;
  notes?: string;
  documentName?: string;
  eta?: string;
}

interface PdfOptimizationResult {
  totalDistance?: number;
  totalDuration?: number;
  fuelSaving?: number;
  co2Saving?: number;
  aiScore?: number;
  aiAnalysis?: string;
}

interface PdfBranding {
  companyName?: string;
  logoUrl?: string | null;
}

async function loadLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportRoutePDF(
  stops: PdfStop[],
  optimizationResult?: PdfOptimizationResult | null,
  vehicleType?: string,
  branding?: PdfBranding
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const companyName = branding?.companyName || "Mijn Bedrijf";

  // --- Load logo ---
  let logoData: string | null = null;
  if (branding?.logoUrl) {
    logoData = await loadLogoAsBase64(branding.logoUrl);
  }

  // --- Header ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);

  const textX = logoData ? 36 : 14;

  if (logoData) {
    try {
      doc.addImage(logoData, "AUTO", 10, 6, 20, 20);
    } catch {
      // logo rendering failed, fall back to text-only
    }
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, textX, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Geoptimaliseerde Route", textX, 23);
  doc.setFontSize(8);
  doc.text(
    `Gegenereerd: ${now.toLocaleDateString("nl-NL")} ${now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth - 14,
    15,
    { align: "right" }
  );
  if (vehicleType) {
    const vehicleLabels: Record<string, string> = {
      truck: "Vrachtwagen",
      van: "Bestelbus",
      car: "Personenauto",
    };
    doc.text(`Voertuig: ${vehicleLabels[vehicleType] || vehicleType}`, pageWidth - 14, 21, { align: "right" });
  }

  let y = 40;

  // --- Samenvatting ---
  if (optimizationResult) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Route Samenvatting", 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate-600

    const summaryItems: string[] = [];
    if (optimizationResult.totalDistance != null)
      summaryItems.push(`Afstand: ${optimizationResult.totalDistance.toFixed(1)} km`);
    if (optimizationResult.totalDuration != null)
      summaryItems.push(`Rijtijd: ${Math.round(optimizationResult.totalDuration)} min`);
    if (optimizationResult.fuelSaving != null)
      summaryItems.push(`Brandstofbesparing: ${optimizationResult.fuelSaving.toFixed(1)} L`);
    if (optimizationResult.co2Saving != null)
      summaryItems.push(`CO2-besparing: ${optimizationResult.co2Saving.toFixed(1)} kg`);
    if (optimizationResult.aiScore != null)
      summaryItems.push(`AI-score: ${optimizationResult.aiScore}/100`);

    summaryItems.push(`Aantal stops: ${stops.length}`);

    // Render summary in 2 columns
    const colWidth = (pageWidth - 28) / 2;
    summaryItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      doc.text(`- ${item}`, 14 + col * colWidth, y + row * 5);
    });
    y += Math.ceil(summaryItems.length / 2) * 5 + 6;
  }

  // --- Stoppenlijst tabel ---
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Stoppenlijst", 14, y);
  y += 3;

  const priorityLabels: Record<string, string> = {
    high: "Hoog",
    medium: "Normaal",
    low: "Laag",
  };

  const tableBody = stops.map((stop, i) => [
    String(i + 1),
    stop.address || "-",
    stop.city || "-",
    stop.timeWindow || "Flexibel",
    priorityLabels[stop.priority] || stop.priority || "-",
    stop.notes || "-",
    stop.documentName || "-",
  ]);

  const footerText = `${companyName} - Route Export`;

  autoTable(doc, {
    startY: y,
    head: [["#", "Adres", "Stad", "Tijdvenster", "Prioriteit", "Opmerkingen", "Document"]],
    body: tableBody,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 38 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 42 },
      6: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Pagina ${data.pageNumber} van ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
      doc.text(
        footerText,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(`route-export-${now.toISOString().slice(0, 10)}.pdf`);
}
