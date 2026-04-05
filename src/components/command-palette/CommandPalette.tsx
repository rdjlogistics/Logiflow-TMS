import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  FileText,
  Settings,
  Map,
  Calendar,
  CreditCard,
  Building2,
  Warehouse,
  MessageSquare,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface CommandItemType {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  group: 'navigation' | 'actions' | 'search';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load recent items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('command-palette-recent');
    if (stored) setRecentItems(JSON.parse(stored));
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const navigateTo = useCallback((path: string, id: string) => {
    // Save to recent
    const updated = [id, ...recentItems.filter(i => i !== id)].slice(0, 5);
    setRecentItems(updated);
    localStorage.setItem('command-palette-recent', JSON.stringify(updated));
    
    navigate(path);
    setOpen(false);
  }, [navigate, recentItems]);

  const navigationItems: CommandItemType[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Hoofdoverzicht', icon: LayoutDashboard, action: () => navigateTo('/', 'dashboard'), keywords: ['home', 'overzicht'], group: 'navigation' },
    { id: 'orders', label: 'Orders', description: 'Beheer orders en zendingen', icon: Package, action: () => navigateTo('/orders', 'orders'), keywords: ['zendingen', 'shipments'], group: 'navigation' },
    { id: 'trips', label: 'Ritten', description: 'Bekijk en plan ritten', icon: Truck, action: () => navigateTo('/orders', 'trips'), keywords: ['trips', 'routes', 'ritten'], group: 'navigation' },
    { id: 'customers', label: 'Klanten', description: 'Klantenbeheer', icon: Users, action: () => navigateTo('/customers', 'customers'), keywords: ['customers', 'relaties'], group: 'navigation' },
     { id: 'carriers', label: 'Charters', description: 'Partner transporteurs', icon: Building2, action: () => navigateTo('/carriers', 'carriers'), keywords: ['carriers', 'partners', 'charters'], group: 'navigation' },
     { id: 'vehicles', label: 'Vlootbeheer', description: 'Wagenparkbeheer', icon: Truck, action: () => navigateTo('/fleet', 'vehicles'), keywords: ['fleet', 'wagenpark', 'voertuigen'], group: 'navigation' },
     { id: 'track-chauffeurs', label: 'Track Eigen Chauffeurs', description: 'Live tracking van eigen chauffeurs', icon: Map, action: () => navigateTo('/track-chauffeurs', 'track-chauffeurs'), keywords: ['tracking', 'chauffeurs', 'kaart', 'live'], group: 'navigation' },
    { id: 'invoices', label: 'Facturen', description: 'Factuuroverzicht', icon: FileText, action: () => navigateTo('/invoices', 'invoices'), keywords: ['invoices', 'billing'], group: 'navigation' },
    { id: 'cashflow', label: 'Cashflow', description: 'Cashflow cockpit', icon: CreditCard, action: () => navigateTo('/finance/cashflow', 'cashflow'), keywords: ['payments', 'finance', 'cashflow', 'betalingen'], group: 'navigation' },
    { id: 'diesel', label: 'Diesel Staffels', description: 'Dieseltoeslag beheer', icon: FileText, action: () => navigateTo('/finance/diesel', 'diesel'), keywords: ['diesel', 'brandstof', 'toeslag'], group: 'navigation' },
    { id: 'quotes', label: 'Offertes', description: 'Offertes en proforma', icon: FileText, action: () => navigateTo('/sales/quotes', 'quotes'), keywords: ['offerte', 'proforma', 'quote'], group: 'navigation' },
    { id: 'planning-program', label: 'Planning Programma', description: 'Diensten en roosters', icon: Calendar, action: () => navigateTo('/planning-program', 'planning-program'), keywords: ['shifts', 'rooster'], group: 'navigation' },
    { id: 'messenger', label: 'Messenger', description: 'Chat en communicatie', icon: MessageSquare, action: () => navigateTo('/messenger', 'messenger'), keywords: ['chat', 'berichten'], group: 'navigation' },
    { id: 'wms', label: 'Warehouse', description: 'Magazijnbeheer', icon: Warehouse, action: () => navigateTo('/wms', 'wms'), keywords: ['warehouse', 'magazijn'], group: 'navigation' },
    { id: 'settings', label: 'Instellingen', description: 'Systeeminstellingen', icon: Settings, action: () => navigateTo('/admin-settings', 'settings'), keywords: ['settings', 'admin'], group: 'navigation' },
  ];

  const actionItems: CommandItemType[] = [
    { id: 'new-order', label: 'Nieuwe Order', description: 'Maak een nieuwe order aan', icon: Plus, action: () => navigateTo('/orders/edit', 'new-order'), keywords: ['create', 'nieuw', 'aanmaken'], group: 'actions' },
    { id: 'new-trip', label: 'Nieuwe Rit', description: 'Plan een nieuwe rit', icon: Plus, action: () => navigateTo('/orders', 'new-trip'), keywords: ['create', 'nieuw', 'plannen'], group: 'actions' },
    { id: 'track-shipment', label: 'Zending Traceren', description: 'Volg een zending', icon: Search, action: () => navigateTo('/tracking', 'track-shipment'), keywords: ['track', 'trace', 'volgen'], group: 'actions' },
  ];

  const allItems = [...navigationItems, ...actionItems];
  const recentItemsData = recentItems
    .map(id => allItems.find(item => item.id === id))
    .filter(Boolean) as CommandItemType[];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Zoek pagina's, acties..." />
      <CommandList>
        <CommandEmpty>Geen resultaten gevonden.</CommandEmpty>
        
        {recentItemsData.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentItemsData.map((item) => (
                <CommandItem
                  key={`recent-${item.id}`}
                  onSelect={item.action}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        <CommandGroup heading="Acties">
          {actionItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigatie">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{item.description}</span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Keyboard shortcut hint component
export function CommandPaletteHint() {
  return (
    <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  );
}
