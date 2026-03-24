import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { readExcelFileMultiSheet, writeExcelMultiSheet } from "@/lib/excelUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CarrierImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onImportComplete: () => void;
}

interface MappedCarrier {
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
  notes: string | null;
  payment_terms_days: number | null;
  is_active: boolean;
  kvk_number: string | null;
  rating: number | null;
  credit_limit: number | null;
}

interface MappedCarrierWithDupe extends MappedCarrier {
  isDuplicate: boolean;
  duplicateReason: string | null;
  skipImport: boolean;
}

// Target fields for mapping dropdown
const TARGET_FIELDS: { field: keyof MappedCarrier; label: string }[] = [
  { field: 'company_name', label: 'Bedrijfsnaam' },
  { field: 'contact_name', label: 'Contact' },
  { field: 'email', label: 'E-mail' },
  { field: 'phone', label: 'Telefoon' },
  { field: 'address', label: 'Adres' },
  { field: 'postal_code', label: 'Postcode' },
  { field: 'city', label: 'Plaats' },
  { field: 'country', label: 'Land' },
  { field: 'vat_number', label: 'BTW-nr' },
  { field: 'iban', label: 'IBAN' },
  { field: 'bic', label: 'BIC' },
  { field: 'notes', label: 'Notities' },
  { field: 'payment_terms_days', label: 'Betaaltermijn' },
  { field: 'is_active', label: 'Actief' },
  { field: 'kvk_number', label: 'KVK-nr' },
  { field: 'rating', label: 'Beoordeling' },
  { field: 'credit_limit', label: 'Kredietlimiet' },
];

function suggestMapping(header: string, targets: { field: string; label: string }[]): { field: string; confidence: number } | null {
  const norm = header.toLowerCase().replace(/[_\-\s]+/g, '');
  let best = { field: '', confidence: 0 };
  for (const t of targets) {
    const tNorm = t.field.replace(/[_\-\s]+/g, '');
    const lNorm = t.label.toLowerCase().replace(/[_\-\s]+/g, '');
    if (norm.includes(tNorm) || tNorm.includes(norm)) {
      if (70 > best.confidence) best = { field: t.field, confidence: 70 };
    }
    if (norm.includes(lNorm) || lNorm.includes(norm)) {
      if (75 > best.confidence) best = { field: t.field, confidence: 75 };
    }
  }
  return best.confidence > 0 ? best : null;
}

// EasyTrans column → carrier field mapping
const COLUMN_MAP: Record<string, keyof MappedCarrier | '_huisnummer' | '_vehicle_types' | '_permits' | '_payment_method'> = {
  // EasyTrans format
  naam: 'company_name',
  adres: 'address',
  huisnummer: '_huisnummer',
  postcode: 'postal_code',
  woonplaats: 'city',
  land: 'country',
  tav: 'contact_name',
  telefoon: 'phone',
  mobiel: 'phone',
  email: 'email',
  ibannr: 'iban',
  bicnr: 'bic',
  btwnr: 'vat_number',
  opmerkingen: 'notes',
  betalingstermijn: 'payment_terms_days',
  kvknr: 'kvk_number',
  // Eigen export-format aliassen
  bedrijfsnaam: 'company_name',
  contact: 'contact_name',
  plaats: 'city',
  'btw-nr': 'vat_number',
  'kvk-nr': 'kvk_number',
  actief: 'is_active',
  betaaltermijn: 'payment_terms_days',
  voertuigtypes: '_vehicle_types',
  vergunningen: '_permits',
  betaalmethode: '_payment_method',
  notities: 'notes',
  beoordeling: 'rating',
  kredietlimiet: 'credit_limit',
  iban: 'iban',
  bic: 'bic',
};

function mapRow(row: Record<string, unknown>, headers: string[], overrides?: Record<string, string>): MappedCarrier | null {
  const mapped: any = {
    company_name: '',
    contact_name: null,
    email: null,
    phone: null,
    address: null,
    postal_code: null,
    city: null,
    country: null,
    vat_number: null,
    iban: null,
    bic: null,
    notes: null,
    payment_terms_days: null,
    is_active: true,
  };

  let huisnummer = '';

  for (const header of headers) {
    const key = header.toLowerCase().trim();
    const target = COLUMN_MAP[key] || (overrides?.[key] as keyof MappedCarrier | undefined);
    const val = row[header];
    if (!target || val === null || val === undefined || val === '') continue;

    if (target === '_huisnummer') {
      huisnummer = String(val).trim();
    } else if (target === '_vehicle_types' || target === '_permits' || target === '_payment_method') {
      // Skip meta columns from export (not directly importable)
    } else if (target === 'is_active') {
      const strVal = String(val).trim().toLowerCase();
      mapped.is_active = strVal !== 'nee' && strVal !== 'false' && strVal !== '0' && strVal !== 'no';
    } else if (target === 'payment_terms_days') {
      mapped.payment_terms_days = parseInt(String(val)) || null;
    } else if (target === 'rating') {
      mapped.rating = parseFloat(String(val)) || null;
    } else if (target === 'credit_limit') {
      mapped.credit_limit = parseFloat(String(val)) || null;
    } else if (target === 'phone') {
      if (mapped.phone) {
        mapped.phone = `${mapped.phone} / ${String(val).trim()}`;
      } else {
        mapped.phone = String(val).trim() || null;
      }
    } else {
      mapped[target] = String(val).trim() || null;
    }
  }

  if (mapped.address && huisnummer) {
    mapped.address = `${mapped.address} ${huisnummer}`;
  }

  if (!mapped.company_name) return null;
  return mapped as MappedCarrier;
}

type ImportState = 'idle' | 'mapping' | 'checking' | 'preview' | 'importing' | 'done';

interface ImportResult {
  success: number;
  failed: number;
  skippedDuplicates: number;
  errors: string[];
}

async function checkDuplicates(
  rows: MappedCarrier[],
  tenantId: string
): Promise<MappedCarrierWithDupe[]> {
  const { data: existing } = await supabase
    .from('carriers')
    .select('company_name, vat_number')
    .eq('tenant_id', tenantId);

  const existingNames = new Set<string>();
  const existingVats = new Set<string>();

  (existing || []).forEach((c) => {
    if (c.company_name) existingNames.add(c.company_name.toLowerCase().trim());
    if (c.vat_number) existingVats.add(c.vat_number.toLowerCase().trim());
  });

  const seenNames = new Set<string>();
  const seenVats = new Set<string>();

  return rows.map((row): MappedCarrierWithDupe => {
    const nameLower = row.company_name.toLowerCase().trim();
    const vatLower = row.vat_number?.toLowerCase().trim() || '';

    let isDuplicate = false;
    let duplicateReason: string | null = null;

    if (vatLower && existingVats.has(vatLower)) {
      isDuplicate = true;
      duplicateReason = 'BTW-nr bestaat al';
    } else if (existingNames.has(nameLower)) {
      isDuplicate = true;
      duplicateReason = 'Bedrijfsnaam bestaat al';
    } else if (vatLower && seenVats.has(vatLower)) {
      isDuplicate = true;
      duplicateReason = 'Dubbel in bestand (BTW)';
    } else if (seenNames.has(nameLower)) {
      isDuplicate = true;
      duplicateReason = 'Dubbel in bestand (naam)';
    }

    seenNames.add(nameLower);
    if (vatLower) seenVats.add(vatLower);

    return { ...row, isDuplicate, duplicateReason, skipImport: isDuplicate };
  });
}

interface UnmappedHeader {
  original: string;
  suggestion: string | null;
  sampleValues: string[];
}

export default function CarrierImportDialog({ open, onOpenChange, tenantId, onImportComplete }: CarrierImportDialogProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [fileName, setFileName] = useState('');
  const [mappedRows, setMappedRows] = useState<MappedCarrierWithDupe[]>([]);
  const [contactRows, setContactRows] = useState<Record<string, unknown>[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [unmappedHeaders, setUnmappedHeaders] = useState<UnmappedHeader[]>([]);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [rawData, setRawData] = useState<{ rows: Record<string, unknown>[]; headers: string[] } | null>(null);
  const [rawContactRows, setRawContactRows] = useState<Record<string, unknown>[]>([]);
  const { toast } = useToast();

  const reset = () => {
    setState('idle');
    setFileName('');
    setMappedRows([]);
    setContactRows([]);
    setSkippedCount(0);
    setProgress(0);
    setResult(null);
    setUnmappedHeaders([]);
    setCustomMappings({});
    setRawData(null);
    setRawContactRows([]);
  };

  const toggleRowSkip = (index: number) => {
    setMappedRows(prev => prev.map((row, i) =>
      i === index ? { ...row, skipImport: !row.skipImport } : row
    ));
  };

  const processFileData = useCallback(async (
    carrierRows: Record<string, unknown>[],
    headers: string[],
    contacts: Record<string, unknown>[],
    overrides?: Record<string, string>
  ) => {
    const mapped: MappedCarrier[] = [];
    let skipped = 0;

    for (const row of carrierRows) {
      const m = mapRow(row, headers, overrides);
      if (m) {
        mapped.push(m);
      } else {
        skipped++;
      }
    }

    setContactRows(contacts);
    setSkippedCount(skipped);

    setState('checking');
    const withDupes = await checkDuplicates(mapped, tenantId);
    setMappedRows(withDupes);
    setState('preview');
  }, [tenantId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const sheets = await readExcelFileMultiSheet(file);
      
      const carrierSheet = sheets['Charters'] || sheets['Vervoerders'] || Object.values(sheets)[0];
      if (!carrierSheet) {
        toast({ title: "Geen data gevonden", variant: "destructive" });
        return;
      }

      const contactSheet = sheets['Contacten'];
      const contacts = contactSheet?.rows?.length ? contactSheet.rows : [];

      // Check for unmapped headers
      const unmapped: UnmappedHeader[] = [];
      for (const header of carrierSheet.headers) {
        const key = header.toLowerCase().trim();
        if (!COLUMN_MAP[key]) {
          const suggestion = suggestMapping(key, TARGET_FIELDS);
          const sampleValues = carrierSheet.rows
            .slice(0, 3)
            .map(r => String(r[header] ?? ''))
            .filter(v => v && v !== 'undefined');
          unmapped.push({
            original: header,
            suggestion: suggestion && suggestion.confidence > 50 ? suggestion.field : null,
            sampleValues,
          });
        }
      }

      if (unmapped.length > 0) {
        // Store raw data and show mapping step
        setRawData({ rows: carrierSheet.rows, headers: carrierSheet.headers });
        setRawContactRows(contacts);
        setUnmappedHeaders(unmapped);
        // Pre-fill custom mappings with suggestions
        const initial: Record<string, string> = {};
        unmapped.forEach(u => {
          initial[u.original.toLowerCase().trim()] = u.suggestion || '__skip__';
        });
        setCustomMappings(initial);
        setState('mapping');
      } else {
        // All headers known, skip mapping step
        await processFileData(carrierSheet.rows, carrierSheet.headers, contacts);
      }
    } catch {
      toast({ title: "Kan bestand niet lezen", description: "Controleer of het een geldig Excel-bestand is.", variant: "destructive" });
      setState('idle');
    }
  }, [toast, tenantId, processFileData]);

  const handleConfirmMapping = async () => {
    if (!rawData) return;
    // Filter out skipped mappings
    const overrides: Record<string, string> = {};
    for (const [key, val] of Object.entries(customMappings)) {
      if (val !== '__skip__') {
        overrides[key] = val;
      }
    }
    await processFileData(rawData.rows, rawData.headers, rawContactRows, overrides);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const rowsToImport = mappedRows.filter(r => !r.skipImport);
  const duplicateCount = mappedRows.filter(r => r.isDuplicate).length;

  const handleImport = async () => {
    setState('importing');
    setProgress(0);

    const errors: string[] = [];
    let success = 0;
    let failed = 0;
    const batchSize = 20;
    const insertedCarrierNames = new Map<string, string>();

    const cleanRows = rowsToImport.map(({ isDuplicate, duplicateReason, skipImport, ...rest }) => ({
      ...rest,
      tenant_id: tenantId,
    }));

    for (let i = 0; i < cleanRows.length; i += batchSize) {
      const batch = cleanRows.slice(i, i + batchSize);

      const { data, error } = await supabase.from('carriers').insert(batch as any).select('id, company_name');

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        failed += batch.length;
      } else {
        success += batch.length;
        (data || []).forEach((c: any) => insertedCarrierNames.set(c.company_name.toLowerCase(), c.id));
      }

      setProgress(Math.round(((i + batchSize) / cleanRows.length) * 100));
    }

    let contactSuccess = 0;
    if (contactRows.length > 0 && insertedCarrierNames.size > 0) {
      const contactsToInsert: any[] = [];
      for (const row of contactRows) {
        const companyName = String(row['Bedrijfsnaam'] || row['bedrijfsnaam'] || '').toLowerCase().trim();
        const carrierId = insertedCarrierNames.get(companyName);
        if (!carrierId) continue;
        const name = String(row['Naam'] || row['naam'] || '').trim();
        if (!name) continue;
        contactsToInsert.push({
          carrier_id: carrierId,
          tenant_id: tenantId,
          name,
          role: String(row['Rol'] || row['rol'] || '').trim() || null,
          email: String(row['Email'] || row['email'] || '').trim() || null,
          phone: String(row['Telefoon'] || row['telefoon'] || '').trim() || null,
          is_primary: String(row['Primair'] || row['primair'] || '').toLowerCase() === 'ja',
        });
      }

      if (contactsToInsert.length > 0) {
        const { error: cErr } = await supabase.from('carrier_contacts').insert(contactsToInsert);
        if (cErr) {
          errors.push(`Contacten: ${cErr.message}`);
        } else {
          contactSuccess = contactsToInsert.length;
        }
      }
    }

    const skippedDuplicates = mappedRows.filter(r => r.skipImport).length;

    setResult({ success, failed, skippedDuplicates, errors: errors.slice(0, 5) });
    setState('done');

    if (success > 0) onImportComplete();
    if (contactSuccess > 0) toast({ title: `${contactSuccess} contactpersonen geïmporteerd` });
  };

  const downloadTemplate = async () => {
    await writeExcelMultiSheet([
      {
        name: 'Charters',
        headers: ['vervoerdernr', 'naam', 'adres', 'huisnummer', 'adres2', 'postcode', 'woonplaats', 'land', 'tav', 'postadres', 'posthuisnummer', 'postadres2', 'postpostcode', 'postwoonplaats', 'postland', 'telefoon', 'mobiel', 'email', 'website', 'ibannr', 'bicnr', 'banknr', 'kvknr', 'btwnr', 'opmerkingen', 'betalingstermijn'],
        rows: [
          ['1', 'Transport BV', 'Industrieweg', '10', '', '1000AA', 'Amsterdam', 'Nederland', 'Jan Jansen', '', '', '', '', '', '', '0201234567', '0612345678', 'info@transport.nl', 'www.transport.nl', 'NL91ABNA0417164300', 'ABNANL2A', '', '12345678', 'NL123456789B01', '', '30'],
        ],
      },
      {
        name: 'Contacten',
        headers: ['Bedrijfsnaam', 'Naam', 'Rol', 'Email', 'Telefoon', 'Primair'],
        rows: [
          ['Transport BV', 'Jan Jansen', 'Directeur', 'jan@transport.nl', '0612345678', 'Ja'],
          ['Transport BV', 'Piet Peters', 'Planning', 'piet@transport.nl', '0687654321', 'Nee'],
        ],
      },
    ], 'EasyTrans-Import-Charters.xlsx');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  // Get already-used target fields to avoid double-mapping
  const usedTargets = new Set(
    Object.values(customMappings).filter(v => v !== '__skip__')
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Charters importeren
          </DialogTitle>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Sleep een Excel-bestand hierheen</p>
              <p className="text-sm text-muted-foreground mt-1">of klik om een bestand te selecteren (.xlsx, .xls, .csv)</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Nog geen importbestand? Download het EasyTrans template.</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Template downloaden
              </Button>
            </div>
          </div>
        )}

        {state === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm">
                <span className="font-medium">{unmappedHeaders.length} onbekende kolom{unmappedHeaders.length !== 1 ? 'men' : ''}</span> gevonden.
                Wijs ze toe aan een veld of sla ze over.
              </p>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bronkolom</TableHead>
                    <TableHead>Toewijzen aan</TableHead>
                    <TableHead>Voorbeelddata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedHeaders.map((uh) => {
                    const key = uh.original.toLowerCase().trim();
                    const currentValue = customMappings[key] || '__skip__';
                    return (
                      <TableRow key={uh.original}>
                        <TableCell className="font-medium">{uh.original}</TableCell>
                        <TableCell>
                          <Select
                            value={currentValue}
                            onValueChange={(val) =>
                              setCustomMappings(prev => ({ ...prev, [key]: val }))
                            }
                          >
                            <SelectTrigger className="w-[180px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">Overslaan</SelectItem>
                              {TARGET_FIELDS.map((tf) => (
                                <SelectItem
                                  key={tf.field}
                                  value={tf.field}
                                  disabled={usedTargets.has(tf.field) && currentValue !== tf.field}
                                >
                                  {tf.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {uh.sampleValues.slice(0, 2).join(', ') || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Button variant="outline" onClick={reset}>Terug</Button>
              <Button onClick={handleConfirmMapping} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Bevestigen &amp; doorgaan
              </Button>
            </div>
          </div>
        )}

        {state === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Duplicaten controleren...</p>
            <p className="text-sm text-muted-foreground">Bestaande charters worden vergeleken</p>
          </div>
        )}

        {state === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {mappedRows.length} charter{mappedRows.length !== 1 ? 's' : ''} gevonden
                  {contactRows.length > 0 && (
                    <span> • {contactRows.length} contactperso{contactRows.length !== 1 ? 'nen' : 'on'}</span>
                  )}
                  {skippedCount > 0 && (
                    <span className="text-amber-500"> • {skippedCount} rij(en) overgeslagen (geen naam)</span>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Ander bestand</Button>
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">{duplicateCount} duplica{duplicateCount !== 1 ? 'ten' : 'at'}</span> gevonden op basis van BTW-nummer of bedrijfsnaam. Deze worden standaard overgeslagen.
                </p>
              </div>
            )}

            <div className="overflow-x-auto border rounded-lg max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Bedrijfsnaam</TableHead>
                    <TableHead>Plaats</TableHead>
                    <TableHead>BTW-nr</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className={cn(row.skipImport && "opacity-50")}>
                      <TableCell>
                        <Checkbox
                          checked={!row.skipImport}
                          onCheckedChange={() => toggleRowSkip(i)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.company_name}</TableCell>
                      <TableCell className="text-sm">{row.city || '-'}</TableCell>
                      <TableCell className="text-sm">{row.vat_number || '-'}</TableCell>
                      <TableCell className="text-sm">{row.email || '-'}</TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Badge variant="warning" size="sm">{row.duplicateReason}</Badge>
                        ) : (
                          <Badge variant="success" size="sm">Nieuw</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {mappedRows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ... en nog {mappedRows.length - 50} charter(s)
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {rowsToImport.length} van {mappedRows.length} worden geïmporteerd
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Annuleren</Button>
                <Button onClick={handleImport} disabled={rowsToImport.length === 0} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {rowsToImport.length} charter{rowsToImport.length !== 1 ? 's' : ''} importeren
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="font-medium">Bezig met importeren...</p>
              <p className="text-sm text-muted-foreground mt-1">{progress}% voltooid</p>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {state === 'done' && result && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 text-center">
              {result.failed === 0 ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : result.success === 0 ? (
                <XCircle className="h-12 w-12 text-destructive" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              )}
              <div>
                <p className="text-lg font-semibold">Import voltooid</p>
                <div className="flex gap-3 justify-center mt-2 flex-wrap">
                  {result.success > 0 && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {result.success} geïmporteerd
                    </Badge>
                  )}
                  {result.skippedDuplicates > 0 && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {result.skippedDuplicates} duplicaten overgeslagen
                    </Badge>
                  )}
                  {result.failed > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {result.failed} mislukt
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3 text-sm space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-destructive">{err}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" onClick={reset}>Nog een import</Button>
              <Button onClick={() => handleClose(false)}>Sluiten</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
