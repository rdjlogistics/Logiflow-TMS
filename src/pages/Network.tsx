import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCompany, Company } from '@/hooks/useCompany';
import { useCompanyConnections, CompanyConnection } from '@/hooks/useCompanyConnections';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Plus, 
  Check, 
  X, 
  Link2, 
  Unlink, 
  Clock,
  Send,
  Users,
  ArrowRightLeft,
  Loader2,
  Bell
} from 'lucide-react';
import { SendOrderDialog } from '@/components/network/SendOrderDialog';

const Network = () => {
  const { company, loading: companyLoading, createCompany } = useCompany();
  const { 
    connections, 
    pendingRequests, 
    loading, 
    searchCompanies, 
    sendConnectionRequest,
    respondToRequest,
    removeConnection,
    getConnectedCompanies 
  } = useCompanyConnections();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [connectionNote, setConnectionNote] = useState('');
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [sendOrderDialogOpen, setSendOrderDialogOpen] = useState(false);
  const [targetCompanyForOrder, setTargetCompanyForOrder] = useState<{ id: string; name: string } | null>(null);

  const connectedCompanies = getConnectedCompanies();

  // Search companies with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        const results = await searchCompanies(searchQuery);
        setSearchResults(results);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCompanies]);

  const handleConnect = async () => {
    if (!selectedCompany) return;
    
    const success = await sendConnectionRequest(selectedCompany.id, connectionNote);
    if (success) {
      setShowConnectDialog(false);
      setSelectedCompany(null);
      setConnectionNote('');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleSetupCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    const newCompany = await createCompany({ name: newCompanyName.trim() });
    if (newCompany) {
      setShowSetupDialog(false);
      setNewCompanyName('');
    }
  };

  if (companyLoading) {
    return (
      <DashboardLayout title="Charter Netwerk">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Company setup prompt
  if (!company) {
    return (
      <DashboardLayout title="Charter Netwerk">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Building2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Bedrijf instellen</h2>
            <p className="text-muted-foreground max-w-md">
              Om het netwerk te gebruiken, moet je eerst je bedrijfsprofiel aanmaken.
            </p>
          </div>
          <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Bedrijf aanmaken
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bedrijf aanmaken</DialogTitle>
                <DialogDescription>
                  Vul de naam van je bedrijf in om te beginnen.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Bedrijfsnaam"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSetupCompany} disabled={!newCompanyName.trim()}>
                  Aanmaken
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Charter Netwerk">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Charter Netwerk</h1>
            <p className="text-muted-foreground">
              Verbind met andere charters om opdrachten uit te wisselen
            </p>
          </div>

          {/* Current company badge */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mijn bedrijf</p>
                <p className="font-semibold">{company.name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedCompanies.length}</p>
                <p className="text-sm text-muted-foreground">Verbonden bedrijven</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Openstaande verzoeken</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Actieve uitbestedingen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections" className="gap-2">
              <Users className="h-4 w-4" />
              Verbindingen
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              Verzoeken
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Zoeken
            </TabsTrigger>
          </TabsList>

          {/* Connected Companies */}
          <TabsContent value="connections">
            <Card>
              <CardHeader>
                <CardTitle>Verbonden bedrijven</CardTitle>
                <CardDescription>
                  Bedrijven waarmee je opdrachten kunt uitwisselen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectedCompanies.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Link2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Nog geen verbindingen</h3>
                    <p className="text-muted-foreground mb-4">
                      Zoek naar andere bedrijven om te verbinden
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectedCompanies.map((connectedCompany) => (
                      <div
                        key={connectedCompany.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{connectedCompany.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {connectedCompany.city || 'Geen locatie'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            Verbonden
                          </Badge>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                            setTargetCompanyForOrder({ id: connectedCompany.id, name: connectedCompany.name });
                            setSendOrderDialogOpen(true);
                          }}>
                            <Send className="h-4 w-4" />
                            Stuur opdracht
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              const conn = connections.find(
                                c => c.requesting_company_id === connectedCompany.id || 
                                     c.receiving_company_id === connectedCompany.id
                              );
                              if (conn) removeConnection(conn.id);
                            }}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Inkomende verzoeken</CardTitle>
                <CardDescription>
                  Connectieverzoeken van andere bedrijven
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Geen openstaande verzoeken</h3>
                    <p className="text-muted-foreground">
                      Er zijn momenteel geen connectieverzoeken om te beoordelen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {request.requesting_company?.name || 'Onbekend bedrijf'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.notes || 'Wil graag verbinden'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => respondToRequest(request.id, false)}
                          >
                            <X className="h-4 w-4" />
                            Afwijzen
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => respondToRequest(request.id, true)}
                          >
                            <Check className="h-4 w-4" />
                            Accepteren
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Companies */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Bedrijf zoeken</CardTitle>
                <CardDescription>
                  Zoek naar andere transportbedrijven in het netwerk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op bedrijfsnaam..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {searching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Geen bedrijven gevonden</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map((result) => {
                      const isConnected = connectedCompanies.some(c => c.id === result.id);
                      const isPending = connections.some(
                        c => (c.requesting_company_id === result.id || c.receiving_company_id === result.id) &&
                             c.status === 'pending'
                      );

                      return (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {result.city || 'Geen locatie'}
                              </p>
                            </div>
                          </div>
                          <div>
                            {isConnected ? (
                              <Badge variant="secondary" className="gap-1">
                                <Check className="h-3 w-3" />
                                Verbonden
                              </Badge>
                            ) : isPending ? (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                In afwachting
                              </Badge>
                            ) : (
                              <Dialog open={showConnectDialog && selectedCompany?.id === result.id} onOpenChange={(open) => {
                                setShowConnectDialog(open);
                                if (!open) setSelectedCompany(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => setSelectedCompany(result)}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Verbinden
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Verbindingsverzoek versturen</DialogTitle>
                                    <DialogDescription>
                                      Stuur een connectieverzoek naar {result.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Textarea
                                      placeholder="Voeg een optioneel bericht toe..."
                                      value={connectionNote}
                                      onChange={(e) => setConnectionNote(e.target.value)}
                                      rows={3}
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                      setShowConnectDialog(false);
                                      setSelectedCompany(null);
                                    }}>
                                      Annuleren
                                    </Button>
                                    <Button onClick={handleConnect} className="gap-1">
                                      <Send className="h-4 w-4" />
                                      Versturen
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Send Order Dialog */}
      <SendOrderDialog 
        open={sendOrderDialogOpen} 
        onOpenChange={setSendOrderDialogOpen}
        targetCompany={targetCompanyForOrder}
      />
    </DashboardLayout>
  );
};

export default Network;
