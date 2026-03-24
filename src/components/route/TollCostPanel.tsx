import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Shield, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TollDetectionResult, TollCostEstimate } from '@/hooks/useTollDetection';

interface TollCostPanelProps {
  result: TollDetectionResult | null;
  isLoading: boolean;
  vehicleType: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', AT: '🇦🇹', CH: '🇨🇭', BE: '🇧🇪',
  NL: '🇳🇱', LU: '🇱🇺', ES: '🇪🇸', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺',
  SI: '🇸🇮', HR: '🇭🇷', PT: '🇵🇹', SK: '🇸🇰', RO: '🇷🇴', BG: '🇧🇬',
  GR: '🇬🇷', DK: '🇩🇰', SE: '🇸🇪', NO: '🇳🇴', GB: '🇬🇧', IE: '🇮🇪',
};

const TOLL_TYPE_LABELS: Record<string, string> = {
  vignette: 'Vignet', per_km: 'Per km', per_section: 'Per traject', hybrid: 'Hybride',
};

const VEHICLE_LABELS: Record<string, string> = {
  truck: 'Vrachtwagen (40t)', van: 'Bestelbus (12t)', car: 'Personenauto', bicycle: 'Fiets',
};

function getCostColor(max: number): string {
  if (max <= 10) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  if (max <= 50) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
  return 'from-red-500/20 to-red-500/5 border-red-500/30';
}

function getCostBadgeColor(max: number): string {
  if (max <= 10) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (max <= 50) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-red-500/10 text-red-700 dark:text-red-400';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const TollCountryCard = ({ estimate }: { estimate: TollCostEstimate }) => {
  const flag = COUNTRY_FLAGS[estimate.countryCode] || '🏳️';
  const tollLabel = TOLL_TYPE_LABELS[estimate.tollType] || estimate.tollType;
  const colorClass = getCostColor(estimate.estimatedCost.max);
  const badgeColor = getCostBadgeColor(estimate.estimatedCost.max);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative rounded-xl border bg-gradient-to-br ${colorClass} backdrop-blur-xl p-4 space-y-3 transition-shadow hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          <div>
            <h4 className="font-semibold text-sm">{estimate.country}</h4>
            <p className="text-[10px] text-muted-foreground">{estimate.operator}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${badgeColor} border-0`}>
          {tollLabel}
        </Badge>
      </div>

      {/* Cost */}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight">
          {estimate.currency === 'EUR' ? '€' : estimate.currency + ' '}
          {estimate.estimatedCost.min.toFixed(2)}
        </span>
        {estimate.estimatedCost.min !== estimate.estimatedCost.max && (
          <span className="text-sm text-muted-foreground">
            – {estimate.estimatedCost.max.toFixed(2)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {estimate.distanceInCountry} km
        </span>
        {estimate.notes.map((note, i) => (
          <span key={i}>• {note}</span>
        ))}
      </div>

      {/* Purchase button */}
      {estimate.purchaseUrl && (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/30 transition-all"
            asChild
          >
            <a href={estimate.purchaseUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1.5" />
              {estimate.purchaseLabel || 'Koop hier'}
            </a>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

const TollCostPanel: React.FC<TollCostPanelProps> = ({ result, isLoading, vehicleType }) => {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-xl p-6"
      >
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <div>
            <p className="text-sm font-medium">Tolkosten berekenen...</p>
            <p className="text-[10px] text-muted-foreground">Analyse per land en voertuigtype</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!result) return null;

  if (!result.hasTolls) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-4"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Geen tolkosten op deze route
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Total cost header */}
      <motion.div
        variants={cardVariants}
        className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/5 backdrop-blur-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Totale Tolkosten
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                €{result.totalEstimatedCost.min.toFixed(2)}
              </span>
              {result.totalEstimatedCost.min !== result.totalEstimatedCost.max && (
                <span className="text-sm text-muted-foreground">
                  – €{result.totalEstimatedCost.max.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {VEHICLE_LABELS[vehicleType] || vehicleType}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          {result.countriesWithToll.length} {result.countriesWithToll.length === 1 ? 'land' : 'landen'} met tolheffing op route
        </p>
      </motion.div>

      {/* Country cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {result.countriesWithToll.map((estimate) => (
            <TollCountryCard key={estimate.countryCode} estimate={estimate} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TollCostPanel;
