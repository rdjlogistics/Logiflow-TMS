import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { BookOpen, Play, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Playbook {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  impact: 'low' | 'medium' | 'high';
  steps: string[];
  requiresApproval?: boolean;
}

interface PlaybooksCardProps {
  context: string;
  playbooks: Playbook[];
  onExecutePlaybook?: (playbookId: string) => void;
}

const impactColors = {
  low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const impactLabels = {
  low: 'Laag',
  medium: 'Gemiddeld',
  high: 'Hoog',
};

export const PlaybooksCard: React.FC<PlaybooksCardProps> = ({
  context,
  playbooks,
  onExecutePlaybook,
}) => {
  return (
    <ActionCardWrapper
      title="Aanbevolen Acties"
      icon={<BookOpen className="h-4 w-4 text-indigo-500" />}
      cardType="PLAYBOOKS"
      status="preview"
    >
      <div className="space-y-3">
        {/* Context */}
        <p className="text-xs text-muted-foreground">{context}</p>

        {/* Playbooks List */}
        <div className="space-y-2">
          {playbooks.map((playbook) => (
            <div
              key={playbook.id}
              className="p-3 rounded-md border border-border/50 bg-card/50 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{playbook.title}</span>
                    <Badge className={`text-[10px] px-1 ${impactColors[playbook.impact]}`}>
                      <Zap className="h-2.5 w-2.5 mr-0.5" />
                      {impactLabels[playbook.impact]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {playbook.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {playbook.estimatedTime}
                </div>
              </div>

              {/* Steps Preview */}
              <div className="text-[10px] text-muted-foreground">
                <span className="font-medium">Stappen: </span>
                {playbook.steps.slice(0, 2).join(' → ')}
                {playbook.steps.length > 2 && ` → +${playbook.steps.length - 2} meer`}
              </div>

              <Button
                size="sm"
                variant={playbook.requiresApproval ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                onClick={() => onExecutePlaybook?.(playbook.id)}
              >
                <Play className="h-3 w-3 mr-1" />
                {playbook.requiresApproval ? 'Vraag goedkeuring' : 'Start playbook'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ActionCardWrapper>
  );
};
