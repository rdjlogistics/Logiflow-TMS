import { useState } from 'react';
import { Shipment, Invoice } from '@/components/portal/shared/types';
import { format } from 'date-fns';

export function usePortalExport() {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape values with commas or quotes
          if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(';')
      )
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportShipments = async (shipments: Shipment[]) => {
    setExporting(true);
    try {
      const exportData = shipments.map(s => ({
        Referentie: s.referenceNumber,
        Status: s.status,
        VanStad: s.fromCity,
        NaarStad: s.toCity,
        VanAdres: s.fromAddress || '',
        NaarAdres: s.toAddress || '',
        Colli: s.parcels,
        Gewicht: s.weight || '',
        Prijs: s.price ? `€${s.price.toFixed(2)}` : '',
        TrackingCode: s.trackingCode || '',
        Charter: s.carrier || '',
        Aangemaakt: s.createdAt ? format(new Date(s.createdAt), 'dd-MM-yyyy HH:mm') : '',
        GeplandeLevering: s.estimatedDelivery ? format(new Date(s.estimatedDelivery), 'dd-MM-yyyy') : '',
        Afgeleverd: s.deliveredAt ? format(new Date(s.deliveredAt), 'dd-MM-yyyy HH:mm') : '',
      }));

      exportToCSV(exportData, 'zendingen');
    } finally {
      setExporting(false);
    }
  };

  const exportInvoices = async (invoices: Invoice[]) => {
    setExporting(true);
    try {
      const exportData = invoices.map(inv => ({
        Factuurnummer: inv.number,
        Status: inv.status,
        Bedrag: `€${inv.amount.toFixed(2)}`,
        Valuta: inv.currency,
        Factuurdatum: inv.createdAt ? format(new Date(inv.createdAt), 'dd-MM-yyyy') : '',
        Vervaldatum: inv.dueDate ? format(new Date(inv.dueDate), 'dd-MM-yyyy') : '',
        Betaald: inv.paidAt ? format(new Date(inv.paidAt), 'dd-MM-yyyy') : '',
      }));

      exportToCSV(exportData, 'facturen');
    } finally {
      setExporting(false);
    }
  };

  return {
    exportShipments,
    exportInvoices,
    exporting,
  };
}
