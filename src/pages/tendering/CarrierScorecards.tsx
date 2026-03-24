import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Award, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useCarrierScorecards, CarrierScorecard } from "@/hooks/useCarrierScorecards";

const CarrierScorecards = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("carrier") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierScorecard | null>(null);

  const { 
    scorecards, 
    isLoading, 
    recalculate, 
    isRecalculating, 
    overallStats 
  } = useCarrierScorecards();

  const filteredScorecards = scorecards.filter(scorecard =>
    (scorecard.carrier?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTrendIcon = (scorecard: CarrierScorecard) => {
    // Calculate trend based on OTIF - if above 90 = up, 80-90 = stable, below 80 = down
    const otif = scorecard.otif_percentage || 0;
    if (otif >= 90) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (otif >= 80) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-600";
    if (score >= 85) return "text-amber-600";
    return "text-destructive";
  };

  // Find top performer
  const topPerformer = scorecards.length > 0 
    ? scorecards.reduce((prev, current) => 
        (prev.otif_percentage || 0) > (current.otif_percentage || 0) ? prev : current
      )
    : null;

  if (isLoading) {
    return (
      <DashboardLayout title="SLA & Scorecards">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SLA & Scorecards">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. OTIF</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageOtif)}`}>
                {overallStats.averageOtif}%
              </div>
              <p className="text-xs text-muted-foreground">On-Time In-Full</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accept Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.averageAcceptRate}%</div>
              <p className="text-xs text-muted-foreground">Gemiddeld</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claims</CardTitle>
              <Badge variant="destructive" className="text-xs">{overallStats.totalClaims}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overallStats.totalClaims}</div>
              <p className="text-xs text-muted-foreground">Deze periode</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
              <Award className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {topPerformer?.carrier?.company_name || 'Geen data'}
              </div>
              <p className="text-xs text-muted-foreground">Hoogste OTIF</p>
            </CardContent>
          </Card>
        </div>

        {/* Scorecards Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>Carrier Scorecards</CardTitle>
                <CardDescription>Prestatie-indicatoren per charter</CardDescription>
              </div>
              <Button variant="outline" onClick={() => recalculate()} disabled={isRecalculating}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Berekenen...' : 'Herbereken'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek carriers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {scorecards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen scorecards beschikbaar.</p>
                <p className="text-sm">Klik op "Herbereken" om scorecards te genereren voor actieve carriers.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>OTIF %</TableHead>
                      <TableHead>Accept Rate</TableHead>
                      <TableHead>No-Show</TableHead>
                      <TableHead>Claims</TableHead>
                      <TableHead>Tenders</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScorecards.map((scorecard) => (
                      <TableRow 
                        key={scorecard.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCarrier(scorecard)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(scorecard.otif_percentage || 0) >= 95 && (
                              <Award className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-medium">
                              {scorecard.carrier?.company_name || 'Onbekende carrier'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className={`font-medium ${getScoreColor(scorecard.otif_percentage || 0)}`}>
                              {scorecard.otif_percentage ?? '-'}%
                            </span>
                            <Progress value={scorecard.otif_percentage || 0} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(scorecard.accept_rate || 0)}>
                            {scorecard.accept_rate ?? '-'}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={(scorecard.no_show_rate || 0) > 2 ? "text-destructive" : "text-muted-foreground"}>
                            {scorecard.no_show_rate ?? 0}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={(scorecard.claims_count || 0) === 0 ? "secondary" : "destructive"}>
                            {scorecard.claims_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {scorecard.accepted_tenders ?? 0}/{scorecard.total_tenders ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getTrendIcon(scorecard)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carrier Detail Sheet */}
        <Sheet open={!!selectedCarrier} onOpenChange={(open) => !open && setSelectedCarrier(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selectedCarrier?.otif_percentage && selectedCarrier.otif_percentage >= 95 && (
                  <Award className="h-5 w-5 text-amber-500" />
                )}
                {selectedCarrier?.carrier?.company_name}
              </SheetTitle>
              <SheetDescription>Carrier Performance Scorecard</SheetDescription>
            </SheetHeader>
            {selectedCarrier && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">OTIF Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(selectedCarrier.otif_percentage || 0)}`}>
                      {selectedCarrier.otif_percentage ?? '-'}%
                    </p>
                    <Progress value={selectedCarrier.otif_percentage || 0} className="h-2 mt-2" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Accept Rate</p>
                    <p className={`text-2xl font-bold ${getScoreColor(selectedCarrier.accept_rate || 0)}`}>
                      {selectedCarrier.accept_rate ?? '-'}%
                    </p>
                    <Progress value={selectedCarrier.accept_rate || 0} className="h-2 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold">{selectedCarrier.total_tenders ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Totaal Tenders</p>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-emerald-600">{selectedCarrier.accepted_tenders ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Geaccepteerd</p>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <p className={`text-2xl font-bold ${(selectedCarrier.claims_count || 0) > 0 ? 'text-destructive' : ''}`}>
                      {selectedCarrier.claims_count ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Claims</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">No-Show Rate</p>
                      <p className={`text-lg font-bold ${(selectedCarrier.no_show_rate || 0) > 2 ? 'text-destructive' : ''}`}>
                        {selectedCarrier.no_show_rate ?? 0}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Trend</span>
                      {getTrendIcon(selectedCarrier)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-emerald-600">{selectedCarrier.on_time_deliveries ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Op Tijd Geleverd</p>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold">{selectedCarrier.completed_orders ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Afgeronde Orders</p>
                  </div>
                </div>

                {selectedCarrier.last_calculated_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Laatst bijgewerkt: {new Date(selectedCarrier.last_calculated_at).toLocaleDateString('nl-NL', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1" 
                    onClick={() => navigate(`/tendering/history?carrier=${selectedCarrier.carrier?.company_name}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Bekijk Tender Geschiedenis
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default CarrierScorecards;
