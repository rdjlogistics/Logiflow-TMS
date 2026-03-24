// BTW (VAT) berekening utilities voor Nederland

export type BTWTarief = 'hoog' | 'laag' | 'nul' | 'vrijgesteld';

export const BTW_TARIEVEN: Record<BTWTarief, number> = {
  hoog: 0.21,
  laag: 0.09,
  nul: 0.00,
  vrijgesteld: 0.00,
};

export interface BTWBerekening {
  excl: number;
  btw: number;
  incl: number;
  tarief: BTWTarief;
  percentage: number;
}

export function berekenBTW(bedragExcl: number, tarief: BTWTarief): BTWBerekening {
  const percentage = BTW_TARIEVEN[tarief];
  const btw = Math.round(bedragExcl * percentage * 100) / 100;
  const incl = Math.round((bedragExcl + btw) * 100) / 100;
  return { excl: bedragExcl, btw, incl, tarief, percentage };
}

export function berekenExclVanIncl(bedragIncl: number, tarief: BTWTarief): BTWBerekening {
  const percentage = BTW_TARIEVEN[tarief];
  const excl = Math.round((bedragIncl / (1 + percentage)) * 100) / 100;
  const btw = Math.round((bedragIncl - excl) * 100) / 100;
  return { excl, btw, incl: bedragIncl, tarief, percentage };
}

export interface FactuurRegel {
  omschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  tarief: BTWTarief;
}

export interface FactuurTotalen {
  subtotaal: number;
  btwGroepen: { tarief: BTWTarief; percentage: number; grondslag: number; btw: number }[];
  totaleBTW: number;
  totaalIncl: number;
}

export function berekenFactuurTotalen(regels: FactuurRegel[]): FactuurTotalen {
  const btwMap = new Map<BTWTarief, { grondslag: number; btw: number }>();

  let subtotaal = 0;

  for (const regel of regels) {
    const regelBedrag = Math.round(regel.aantal * regel.eenheidsprijs * 100) / 100;
    subtotaal += regelBedrag;
    const { btw } = berekenBTW(regelBedrag, regel.tarief);
    const existing = btwMap.get(regel.tarief) || { grondslag: 0, btw: 0 };
    btwMap.set(regel.tarief, {
      grondslag: Math.round((existing.grondslag + regelBedrag) * 100) / 100,
      btw: Math.round((existing.btw + btw) * 100) / 100,
    });
  }

  const btwGroepen = Array.from(btwMap.entries()).map(([tarief, { grondslag, btw }]) => ({
    tarief,
    percentage: BTW_TARIEVEN[tarief],
    grondslag,
    btw,
  }));

  const totaleBTW = Math.round(btwGroepen.reduce((s, g) => s + g.btw, 0) * 100) / 100;
  const totaalIncl = Math.round((subtotaal + totaleBTW) * 100) / 100;

  return { subtotaal: Math.round(subtotaal * 100) / 100, btwGroepen, totaleBTW, totaalIncl };
}

export function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

export function isGeldigeTransitie(huidig: string, nieuw: string): boolean {
  const transities: Record<string, string[]> = {
    concept: ['verzonden', 'geannuleerd'],
    verzonden: ['betaald', 'vervallen', 'geannuleerd'],
    betaald: [],
    vervallen: ['betaald'],
    geannuleerd: [],
  };
  return transities[huidig]?.includes(nieuw) ?? false;
}
