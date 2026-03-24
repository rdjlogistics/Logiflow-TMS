import { AlertTriangle, Check, X, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActionPreview {
  type: string;
  summary: string;
  details: Record<string, any>;
}

interface ChatGPTActionCardProps {
  preview: ActionPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ChatGPTActionCard = ({ 
  preview, 
  onConfirm, 
  onCancel, 
  isLoading 
}: ChatGPTActionCardProps) => {
  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <CardTitle className="text-base">Bevestiging vereist</CardTitle>
        </div>
        <Badge variant="outline" className="w-fit">
          <Eye className="w-3 h-3 mr-1" />
          Preview
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="font-medium text-sm">{preview.summary}</p>
        
        <div className="bg-background rounded-lg p-3 space-y-2">
          {Object.entries(preview.details).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Annuleren
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          <Check className="w-4 h-4 mr-1" />
          Bevestigen
        </Button>
      </CardFooter>
    </Card>
  );
};
