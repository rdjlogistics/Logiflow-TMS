import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Plus, 
  Star, 
  StarOff, 
  Trash2, 
  Search,
  Loader2,
  Play,
  Calendar,
  MapPin
} from "lucide-react";
import { useBookingTemplates, BookingTemplate } from "@/hooks/useBookingTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplatesListProps {
  customerId: string;
  tenantId: string;
  onQuickBook?: (template: BookingTemplate) => void;
}

export const TemplatesList = ({ 
  customerId, 
  tenantId,
  onQuickBook,
}: TemplatesListProps) => {
  const {
    templates,
    loading,
    fetchTemplates,
    deleteTemplate,
    toggleFavorite,
  } = useBookingTemplates(customerId);

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate(deleteId);
      setDeleteId(null);
    }
  };

  const getTemplatePreview = (template: BookingTemplate) => {
    const payload = template.payload_json as Record<string, unknown>;
    return {
      pickup: payload?.pickup_city as string || "Ophaaladres",
      delivery: payload?.delivery_city as string || "Afleveradres",
      service: payload?.service_type as string || "Standaard",
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek sjabloon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <Card className="premium-card border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Geen sjablonen</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search 
                ? "Pas je zoekopdracht aan" 
                : "Sla een boeking op als sjabloon voor sneller herboeken"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const preview = getTemplatePreview(template);
          return (
            <Card key={template.id} className="premium-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_favorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(template.id)}
                    >
                      {template.is_favorite ? (
                        <StarOff className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Van:</span>
                  <span>{preview.pickup}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">Naar:</span>
                  <span>{preview.delivery}</span>
                </div>
                
                <Badge variant="secondary" className="text-xs">
                  {preview.service}
                </Badge>

                <Button 
                  className="w-full btn-premium mt-2" 
                  size="sm"
                  onClick={() => onQuickBook?.(template)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Boek nu
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sjabloon verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
