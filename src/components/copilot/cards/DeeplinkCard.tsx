import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DeeplinkCardProps {
  title: string;
  description: string;
  path: string;
  icon?: React.ReactNode;
}

export const DeeplinkCard: React.FC<DeeplinkCardProps> = ({
  title,
  description,
  path,
  icon,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(path);
  };

  return (
    <ActionCardWrapper
      title="Navigatie"
      icon={<ExternalLink className="h-4 w-4 text-blue-500" />}
      cardType="DEEPLINK"
      status="preview"
    >
      <div className="space-y-3">
        <div className="p-3 rounded-md bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <Button 
          className="w-full" 
          size="sm"
          onClick={handleNavigate}
        >
          Open pagina
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </ActionCardWrapper>
  );
};
