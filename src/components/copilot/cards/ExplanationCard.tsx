import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { Lightbulb, ExternalLink, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface EvidenceLink {
  label: string;
  entityType: string;
  entityId: string;
  url?: string;
  value?: string;
}

interface ExplanationCardProps {
  title: string;
  topReasons: string[];
  tradeOffs?: string[];
  risks?: string[];
  confidenceScore: number;
  evidenceLinks?: EvidenceLink[];
  onNavigate?: (url: string) => void;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  title,
  topReasons,
  tradeOffs,
  risks,
  confidenceScore,
  evidenceLinks,
  onNavigate,
}) => {
  return (
    <ActionCardWrapper
      title={title}
      icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}
      cardType="EXPLANATION"
      status="executed"
    >
      <div className="space-y-3">
        {/* Confidence Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Betrouwbaarheid</span>
            <span className="font-medium">{confidenceScore}%</span>
          </div>
          <Progress value={confidenceScore} className="h-1.5" />
        </div>

        {/* Top Reasons */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            Top redenen
          </div>
          <ul className="space-y-1">
            {topReasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className="text-[10px] px-1 shrink-0">
                  {i + 1}
                </Badge>
                <span className="text-muted-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trade-offs */}
        {tradeOffs && tradeOffs.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium">Afwegingen</div>
            <ul className="space-y-0.5">
              {tradeOffs.map((tradeOff, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-yellow-500">↔</span>
                  {tradeOff}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {risks && risks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              Risico's
            </div>
            <ul className="space-y-0.5">
              {risks.map((risk, i) => (
                <li key={i} className="text-xs text-orange-600 flex items-start gap-1">
                  <span>⚠️</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence Links */}
        {evidenceLinks && evidenceLinks.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground">Onderbouwing</div>
            <div className="space-y-1">
              {evidenceLinks.map((link, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-7 text-xs"
                  onClick={() => link.url && onNavigate?.(link.url)}
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1">
                      {link.entityType}
                    </Badge>
                    <span className="truncate">{link.label}</span>
                  </span>
                  {link.value ? (
                    <span className="font-medium text-primary">{link.value}</span>
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ActionCardWrapper>
  );
};
