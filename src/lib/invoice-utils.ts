// Invoice business logic utilities for LogiFlow TMS
import { addDays, toIsoDate } from './date-utils';
import { isGeldigeTransitie } from './btw';

export type InvoiceStatus = 'concept' | 'verzonden' | 'betaald' | 'vervallen' | 'gedeeltelijk_betaald';

// --- Due date calculation ---

/** Calculate due date based on invoice date + payment terms */
export function calcDueDate(invoiceDate: string | Date, paymentTermsDays: number): string {
  return toIsoDate(addDays(invoiceDate, paymentTermsDays)) ?? '';
}

/** How many days until (or since) the due date. Negative = overdue */
export function daysOverdue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86400000);
}

/** Is the invoice overdue right now? */
export function isOverdue(invoice: { status: string; due_date?: string | null }): boolean {
  if (invoice.status === 'betaald') return false;
  if (!invoice.due_date) return false;
  return (daysOverdue(invoice.due_date) ?? 0) > 0;
}

// --- Amount helpers ---

/** Outstanding balance on an invoice */
export function openstaandBedrag(invoice: {
  total_amount: number;
  amount_paid?: number | null;
}): number {
  const paid = invoice.amount_paid ?? 0;
  return Math.max(0, Math.round((invoice.total_amount - paid) * 100) / 100);
}

/** Payment completion percentage */
export function betaalPercentage(invoice: {
  total_amount: number;
  amount_paid?: number | null;
}): number {
  if (invoice.total_amount === 0) return 0;
  const paid = invoice.amount_paid ?? 0;
  return Math.min(100, Math.round((paid / invoice.total_amount) * 100));
}

/** Determine the correct status based on amounts */
export function determineInvoiceStatus(invoice: {
  total_amount: number;
  amount_paid?: number | null;
  due_date?: string | null;
  current_status?: string;
}): InvoiceStatus {
  const paid = invoice.amount_paid ?? 0;
  const total = invoice.total_amount;

  if (paid >= total && total > 0) return 'betaald';
  if (paid > 0 && paid < total) return 'gedeeltelijk_betaald';
  if (isOverdue({ status: 'verzonden', due_date: invoice.due_date })) return 'vervallen';
  return (invoice.current_status as InvoiceStatus) ?? 'concept';
}

// --- Status transitions ---

/** All allowed next statuses from the current one */
export function mogelijkeTransities(huidig: InvoiceStatus): InvoiceStatus[] {
  const map: Record<InvoiceStatus, InvoiceStatus[]> = {
    concept: ['verzonden', 'geannuleerd' as InvoiceStatus],
    verzonden: ['betaald', 'vervallen', 'gedeeltelijk_betaald', 'geannuleerd' as InvoiceStatus],
    gedeeltelijk_betaald: ['betaald', 'vervallen'],
    betaald: [],
    vervallen: ['betaald'],
  };
  return map[huidig] ?? [];
}

/** Whether a status transition is allowed (delegates to btw.ts helper) */
export function kanTransitie(huidig: string, nieuw: string): boolean {
  return isGeldigeTransitie(huidig, nieuw);
}

// --- Invoice numbering ---

const INVOICE_PREFIX_RE = /^([A-Z]+)-?(\d{4})-?(\d+)$/;

/** Parse an invoice number into its parts */
export function parseInvoiceNumber(num: string): {
  prefix: string;
  year: number;
  sequence: number;
} | null {
  const match = num.toUpperCase().match(INVOICE_PREFIX_RE);
  if (!match) return null;
  return {
    prefix: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

/** Format a sequence number into a standardised invoice number */
export function formatInvoiceNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

// --- Reminder logic ---

export interface ReminderLevel {
  level: 1 | 2 | 3;
  label: string;
  daysOverdue: number;
  subject: string;
}

const REMINDER_LEVELS: ReminderLevel[] = [
  { level: 1, label: 'Herinnering', daysOverdue: 7, subject: 'Herinnering betaling openstaande factuur' },
  { level: 2, label: 'Aanmaning', daysOverdue: 21, subject: 'Aanmaning openstaande factuur' },
  { level: 3, label: 'Laatste aanmaning', daysOverdue: 42, subject: '⚠️ Laatste aanmaning voor incasso' },
];

/** Which reminder level applies given days overdue? */
export function reminderNiveau(days: number): ReminderLevel | null {
  for (let i = REMINDER_LEVELS.length - 1; i >= 0; i--) {
    if (days >= REMINDER_LEVELS[i].daysOverdue) return REMINDER_LEVELS[i];
  }
  return null;
}

// --- Formatting ---

export function formatEuroBedrag(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}
