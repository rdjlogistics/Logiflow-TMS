// Document Types for Elite Class Document Generation System

export type DocumentType = 
  | 'vrachtbrief'
  | 'transportopdracht'
  | 'orderlijst'
  | 'cmr_full'
  | 'cmr_overlay'
  | 'label_a6'
  | 'label_a4'
  | 'proforma';

export type DocumentCopy = 'sender' | 'receiver' | 'carrier' | 'second_carrier';

export type CarrierBranding = 'own' | 'carrier' | 'none';

export type DocumentLanguage = 'nl' | 'en' | 'de' | 'fr';

export interface DocumentTypeConfig {
  value: DocumentType;
  label: string;
  description: string;
  supportsCopies: boolean;
  supportsBranding: boolean;
  icon: string;
}

export interface DocumentGenerationOptions {
  orderId: string;
  documentType: DocumentType;
  copies?: DocumentCopy[];
  carrierBranding?: CarrierBranding;
  language?: DocumentLanguage;
  overlayCount?: number;
}

export interface DocumentGenerationResponse {
  success: boolean;
  url?: string;
  html?: string;
  error?: string;
  fileName?: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    value: 'vrachtbrief',
    label: 'Vrachtbrief',
    description: 'Voor transporten tot 500kg. Niet rechtsgeldig voor transporten boven de 500kg.',
    supportsCopies: true,
    supportsBranding: true,
    icon: 'FileText',
  },
  {
    value: 'transportopdracht',
    label: 'Transportopdracht',
    description: 'Document voor bevestiging van het transport aan de charter, inclusief de afgesproken transportkosten.',
    supportsCopies: false,
    supportsBranding: true,
    icon: 'ClipboardList',
  },
  {
    value: 'orderlijst',
    label: 'Orderlijst',
    description: 'Overzicht van meerdere bestemmingen op één pagina. Per bestemming kan voor ontvangst een handtekening worden gezet.',
    supportsCopies: false,
    supportsBranding: true,
    icon: 'List',
  },
  {
    value: 'cmr_full',
    label: 'CMR volledig (blanco A4)',
    description: 'Rechtsgeldig voor transporten boven de 500kg of internationaal transport volgens de AVC of CMR condities. Wordt in viervoud afgedrukt.',
    supportsCopies: true,
    supportsBranding: true,
    icon: 'FileCheck',
  },
  {
    value: 'cmr_overlay',
    label: 'CMR overlay (voorbedrukt A4)',
    description: 'Gegevens worden op de juiste plek op een voorbedrukte CMR afgedrukt. Geschikt voor originele CMR documenten.',
    supportsCopies: false,
    supportsBranding: false,
    icon: 'Layers',
  },
  {
    value: 'label_a6',
    label: 'Verzendlabel (10x15cm)',
    description: 'Etiketten geschikt voor een labelprinter met labels van A6 formaat (10x15cm).',
    supportsCopies: false,
    supportsBranding: true,
    icon: 'Tag',
  },
  {
    value: 'label_a4',
    label: 'Verzendlabel (4x op A4)',
    description: 'Etiketten geschikt voor afdrukken op A4 stickervellen met vier labels per pagina.',
    supportsCopies: false,
    supportsBranding: true,
    icon: 'LayoutGrid',
  },
  {
    value: 'proforma',
    label: 'Proforma factuur',
    description: 'Voorlopige factuur. Kan onder andere worden gebruikt om een vooruitbetaling te vragen.',
    supportsCopies: false,
    supportsBranding: true,
    icon: 'Receipt',
  },
];

export const DOCUMENT_COPIES: { value: DocumentCopy; label: string }[] = [
  { value: 'sender', label: 'Exemplaar voor afzender' },
  { value: 'receiver', label: 'Exemplaar voor ontvanger' },
  { value: 'carrier', label: 'Exemplaar voor charter' },
  { value: 'second_carrier', label: 'Exemplaar voor tweede charter' },
];

export const CARRIER_BRANDING_OPTIONS: { value: CarrierBranding; label: string; description: string }[] = [
  { value: 'own', label: 'Eigen bedrijfsgegevens', description: 'Uw eigen bedrijfsgegevens worden op het document vermeld' },
  { value: 'carrier', label: 'Gegevens charter', description: 'De gegevens van de uitvoerende charter worden vermeld' },
  { value: 'none', label: 'Niet vermelden', description: 'Geen bedrijfsgegevens worden op het document vermeld' },
];

export const DOCUMENT_LANGUAGES: { value: DocumentLanguage; label: string }[] = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];
