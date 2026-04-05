import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'logiflow_recent_pages';
const MAX_RECENT = 5;

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: string;
}

// Route to label mapping (subset of navigation items)
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Command Center',
  '/orders': 'Orderoverzicht',
  '/trips': 'Ritten',
  '/customers': 'Klanten',
  '/carriers': 'Charters',
  '/invoices': 'Facturen',
  '/finance/cashflow': 'Cashflow',
  '/finance/diesel': 'Diesel Staffels',
  '/sales/quotes': 'Offertes',
  '/fleet': 'Vlootbeheer',
  '/track-chauffeurs': 'Track Chauffeurs',
  '/messenger': 'Messenger',
  '/email': 'E-mail Inbox',
  '/kpi': 'KPI Dashboard',
  '/reporting': 'Rapportage',
  '/finance/cashflow': 'Cashflow',
  '/finance/receivables': 'Debiteuren',
  '/operations/pod': 'Digitale POD',
  '/admin/settings': 'Instellingen',
  '/purchase-invoices': 'Inkoopfacturen',
  '/claims': 'Claims',
  '/planning/program': 'Programma',
  '/wms': 'WMS Dashboard',
  '/co2': 'CO₂ Rapportage',
  '/address-book': 'Adresboek',
  '/products': 'Producten',
  '/network': 'Charter Netwerk',
};

function getRecentPages(): RecentPage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentPages(pages: RecentPage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch { /* ignore */ }
}

export function useRecentPages() {
  const location = useLocation();
  const [recentPages, setRecentPages] = useState<RecentPage[]>(getRecentPages);

  useEffect(() => {
    const path = location.pathname;
    // Skip auth, onboarding, and similar non-app pages
    if (path === '/auth' || path === '/onboarding' || path === '/') return;
    
    const title = ROUTE_LABELS[path];
    if (!title) return; // Only track known routes

    const newPage: RecentPage = { path, title, visitedAt: new Date().toISOString() };
    
    setRecentPages(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [newPage, ...filtered].slice(0, MAX_RECENT);
      saveRecentPages(updated);
      return updated;
    });
  }, [location.pathname]);

  const clearRecent = useCallback(() => {
    setRecentPages([]);
    saveRecentPages([]);
  }, []);

  return { recentPages, clearRecent };
}
