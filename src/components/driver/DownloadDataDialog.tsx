import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, FileJson, CheckCircle2 } from 'lucide-react';

interface DownloadDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onDownload: (options: {
    includeProfile: boolean;
    includeTrips: boolean;
    includeDocuments: boolean;
    includeLocations: boolean;
  }) => Promise<Blob>;
}

export function DownloadDataDialog({
  open,
  onOpenChange,
  userId,
  onDownload,
}: DownloadDataDialogProps) {
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeTrips, setIncludeTrips] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [includeLocations, setIncludeLocations] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setCompleted(false);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const blob = await onDownload({
        includeProfile,
        includeTrips,
        includeDocuments,
        includeLocations,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setCompleted(true);

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mijn-gegevens-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download gestart",
        description: "Je gegevens worden gedownload.",
      });

      // Reset after a moment
      setTimeout(() => {
        setProgress(0);
        setCompleted(false);
        onOpenChange(false);
      }, 1500);
    } catch (error: unknown) {
      toast({
        title: "Fout bij downloaden",
        description: error instanceof Error ? error.message : "Er ging iets mis bij het voorbereiden van je gegevens.",
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Mijn Gegevens Downloaden
          </DialogTitle>
          <DialogDescription>
            Download een kopie van je persoonlijke gegevens conform de AVG/GDPR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Selecteer welke gegevens je wilt downloaden:
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="profile"
                checked={includeProfile}
                onCheckedChange={(checked) => setIncludeProfile(!!checked)}
              />
              <Label htmlFor="profile" className="cursor-pointer">
                Profielgegevens
                <span className="block text-xs text-muted-foreground">
                  Naam, e-mail, telefoonnummer
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="trips"
                checked={includeTrips}
                onCheckedChange={(checked) => setIncludeTrips(!!checked)}
              />
              <Label htmlFor="trips" className="cursor-pointer">
                Rithistorie
                <span className="block text-xs text-muted-foreground">
                  Alle uitgevoerde ritten en beoordelingen
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="documents"
                checked={includeDocuments}
                onCheckedChange={(checked) => setIncludeDocuments(!!checked)}
              />
              <Label htmlFor="documents" className="cursor-pointer">
                Documenten
                <span className="block text-xs text-muted-foreground">
                  Geüploade documenten en contracten
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="locations"
                checked={includeLocations}
                onCheckedChange={(checked) => setIncludeLocations(!!checked)}
              />
              <Label htmlFor="locations" className="cursor-pointer">
                Locatiegeschiedenis
                <span className="block text-xs text-muted-foreground">
                  GPS-gegevens van actieve ritten
                </span>
              </Label>
            </div>
          </div>

          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Voorbereiden...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {completed && (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Download voltooid!</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading}>
            Annuleren
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={downloading || (!includeProfile && !includeTrips && !includeDocuments && !includeLocations)}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Downloaden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
