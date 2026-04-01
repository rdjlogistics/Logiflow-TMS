import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDuplicateCandidates, useResolveDuplicate } from '@/hooks/useWorldClassData';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Building2, 
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  GitMerge,
  Eye,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const DataQuality = () => {
  const { data: duplicates, isLoading, refetch } = useDuplicateCandidates();
  const resolveDuplicate = useResolveDuplicate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const handleScan = async () => {
    setIsScanning(true);
    toast({ title: "Duplicaat scan gestart", description: "Het systeem scant alle entiteiten..." });
    
    // Simulate scanning with delay, then refetch
    setTimeout(async () => {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['duplicateCandidates'] });
      setIsScanning(false);
      toast({ title: "Scan voltooid ✓", description: `${duplicates?.length || 0} potentiële duplicaten gevonden.` });
    }, 2000);
  };


  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="h-4 w-4" />;
      case 'payee':
        return <Building2 className="h-4 w-4" />;
      case 'address':
        return <MapPin className="h-4 w-4" />;
      case 'supplier':
        return <Truck className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">{(confidence * 100).toFixed(0)}%</Badge>;
    } else if (confidence >= 0.8) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">{(confidence * 100).toFixed(0)}%</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">{(confidence * 100).toFixed(0)}%</Badge>;
    }
  };

  const handleMerge = async (keepId: string) => {
    if (selectedDuplicate) {
      await resolveDuplicate.mutateAsync({ 
        id: selectedDuplicate.id, 
        status: 'merged',
        merged_to_id: keepId
      });
      setSelectedDuplicate(null);
    }
  };

  const handleNotDuplicate = async () => {
    if (selectedDuplicate) {
      await resolveDuplicate.mutateAsync({ 
        id: selectedDuplicate.id, 
        status: 'not_duplicate'
      });
      setSelectedDuplicate(null);
    }
  };

  const displayDuplicates = duplicates || [];

  return (
    <DashboardLayout 
      title="Data Quality" 
      description="Duplicaat detectie en data cleanup"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayDuplicates.length}</p>
                  <p className="text-xs text-muted-foreground">Mogelijke duplicaten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayDuplicates.filter(d => d.entity_type === 'customer').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Klant duplicaten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayDuplicates.filter(d => d.entity_type === 'address').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Adres duplicaten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayDuplicates.filter(d => d.entity_type === 'payee').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Payee duplicaten</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Duplicaat Kandidaten</h3>
            <p className="text-sm text-muted-foreground">Review en merge potentiële duplicaten</p>
          </div>
          <Button variant="outline" onClick={handleScan} disabled={isScanning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan Opnieuw'}
          </Button>
        </div>

        {/* Duplicates Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Record A</TableHead>
                  <TableHead>Record B</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Match Redenen</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayDuplicates.map((dup: any) => (
                  <TableRow key={dup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEntityIcon(dup.entity_type)}
                        <span className="capitalize">{dup.entity_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dup.entity_a_name || dup.entity_id_a}</p>
                        <p className="text-xs text-muted-foreground font-mono">{dup.entity_id_a}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dup.entity_b_name || dup.entity_id_b}</p>
                        <p className="text-xs text-muted-foreground font-mono">{dup.entity_id_b}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getConfidenceBadge(dup.confidence)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dup.match_reasons && Object.entries(dup.match_reasons).map(([key, value]) => (
                          value && (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key.replace(/_/g, ' ')}
                            </Badge>
                          )
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDuplicate(dup)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDuplicate(dup)}
                        >
                          <GitMerge className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Merge Dialog */}
        <Dialog open={!!selectedDuplicate} onOpenChange={() => setSelectedDuplicate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Duplicaat Review</DialogTitle>
              <DialogDescription>
                Vergelijk de records en kies welke je wilt behouden
              </DialogDescription>
            </DialogHeader>
            {selectedDuplicate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleMerge(selectedDuplicate.entity_id_a)}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {getEntityIcon(selectedDuplicate.entity_type)}
                        Record A
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedDuplicate.entity_a_name || selectedDuplicate.entity_id_a}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{selectedDuplicate.entity_id_a}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMerge(selectedDuplicate.entity_id_a);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Behoud deze
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border-2 hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleMerge(selectedDuplicate.entity_id_b)}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {getEntityIcon(selectedDuplicate.entity_type)}
                        Record B
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedDuplicate.entity_b_name || selectedDuplicate.entity_id_b}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{selectedDuplicate.entity_id_b}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMerge(selectedDuplicate.entity_id_b);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Behoud deze
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Match score: {(selectedDuplicate.confidence * 100).toFixed(0)}%</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDuplicate.match_reasons && Object.entries(selectedDuplicate.match_reasons).map(([key, value]) => (
                      <Badge key={key} variant={value ? "default" : "outline"} className="text-xs">
                        {key.replace(/_/g, ' ')}: {value ? '✓' : '✗'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleNotDuplicate}>
                <XCircle className="h-4 w-4 mr-2" />
                Geen Duplicaat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DataQuality;
