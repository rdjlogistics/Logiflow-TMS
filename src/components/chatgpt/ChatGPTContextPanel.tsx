import { Info, FileText, Filter, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatContext } from '@/hooks/useChatGPT';

interface ChatGPTContextPanelProps {
  context: ChatContext;
  userRole?: string;
}

export const ChatGPTContextPanel = ({ context, userRole }: ChatGPTContextPanelProps) => {
  const hasSelectedOrders = context.selectedOrders && context.selectedOrders.length > 0;
  const hasFilters = context.filters && Object.keys(context.filters).length > 0;
  const hasDateRange = context.dateRange?.from || context.dateRange?.to;
  
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Huidige Context
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* User Role */}
        {userRole && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Rol:</span>
            <Badge variant="secondary" className="text-xs">
              {userRole}
            </Badge>
          </div>
        )}
        
        {/* Current Page */}
        {context.currentPage && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pagina:</span>
            <span className="text-xs font-medium">{context.currentPage}</span>
          </div>
        )}
        
        {/* Selected Orders */}
        {hasSelectedOrders && (
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground">Geselecteerd:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {context.selectedOrders!.slice(0, 5).map(id => (
                  <Badge key={id} variant="outline" className="text-xs">
                    {id.substring(0, 8)}...
                  </Badge>
                ))}
                {context.selectedOrders!.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{context.selectedOrders!.length - 5} meer
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Active Filters */}
        {hasFilters && (
          <div className="flex items-start gap-2">
            <Filter className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground">Filters:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(context.filters!).map(([key, value]) => (
                  value && (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  )
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Date Range */}
        {hasDateRange && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Periode:</span>
            <span className="text-xs font-medium">
              {context.dateRange?.from || '...'} t/m {context.dateRange?.to || '...'}
            </span>
          </div>
        )}
        
        {/* Empty State */}
        {!hasSelectedOrders && !hasFilters && !hasDateRange && !context.currentPage && (
          <p className="text-xs text-muted-foreground italic">
            Geen actieve context. Navigeer naar een pagina of selecteer orders.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
