import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Users, Edit, Trash2, Star, ChevronRight, Building2, Loader2 } from "lucide-react";
import { useCarrierPools, useAvailableCarriers, CarrierPool } from "@/hooks/useCarrierPools";

const CarrierPools = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<CarrierPool | null>(null);
  const [carrierSearch, setCarrierSearch] = useState("");
  
  // Form state for new pool
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolDescription, setNewPoolDescription] = useState("");
  const [newPoolPriority, setNewPoolPriority] = useState("1");

  const { 
    pools, 
    isLoading, 
    createPool, 
    deletePool,
    addCarrier, 
    removeCarrier, 
    isCreating 
  } = useCarrierPools();
  
  const { data: availableCarriers = [], isLoading: isLoadingCarriers } = useAvailableCarriers();

  const filteredPools = pools.filter(pool =>
    pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pool.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get carriers not already in the selected pool
  const filteredAvailableCarriers = availableCarriers.filter(carrier => {
    const isInPool = selectedPool?.carrier_pool_members?.some(
      member => member.carrier_id === carrier.id
    );
    const matchesSearch = carrier.company_name.toLowerCase().includes(carrierSearch.toLowerCase());
    return !isInPool && matchesSearch;
  });

  const handleCreate = () => {
    if (!newPoolName.trim()) return;
    
    createPool({
      name: newPoolName,
      description: newPoolDescription || undefined,
      priority: parseInt(newPoolPriority) || 1
    });
    
    setIsCreateOpen(false);
    setNewPoolName("");
    setNewPoolDescription("");
    setNewPoolPriority("1");
  };

  const handleRemoveCarrier = (memberId: string) => {
    removeCarrier(memberId);
    // Update selected pool to reflect removal
    if (selectedPool) {
      setSelectedPool({
        ...selectedPool,
        carrier_pool_members: selectedPool.carrier_pool_members?.filter(m => m.id !== memberId)
      });
    }
  };

  const handleAddCarrier = (carrierId: string) => {
    if (!selectedPool) return;
    
    addCarrier({
      pool_id: selectedPool.id,
      carrier_id: carrierId,
      priority: 0
    });
    
    setIsAddCarrierOpen(false);
    setCarrierSearch("");
  };

  // Calculate average score for a pool
  const getPoolAvgScore = (pool: CarrierPool) => {
    const members = pool.carrier_pool_members || [];
    if (members.length === 0) return 0;
    const totalRating = members.reduce((acc, m) => acc + (m.carrier?.rating || 0), 0);
    return Math.round(totalRating / members.length);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Carrier Pools">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Carrier Pools">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pools List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <CardTitle>Carrier Pools</CardTitle>
                    <CardDescription>Groepeer charters voor gerichte tenders</CardDescription>
                  </div>
                  <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nieuwe Pool
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nieuwe Carrier Pool</DialogTitle>
                        <DialogDescription>Maak een groep van charters voor tenders.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Naam</Label>
                          <Input 
                            placeholder="bijv. Premium Carriers" 
                            value={newPoolName}
                            onChange={(e) => setNewPoolName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Beschrijving</Label>
                          <Textarea 
                            placeholder="Beschrijving van deze pool..." 
                            value={newPoolDescription}
                            onChange={(e) => setNewPoolDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Prioriteit</Label>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            min="1" 
                            value={newPoolPriority}
                            onChange={(e) => setNewPoolPriority(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuleren</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !newPoolName.trim()}>
                          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Pool Aanmaken
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek pools..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {filteredPools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Geen carrier pools gevonden.</p>
                    <p className="text-sm">Maak een nieuwe pool om te beginnen.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pool</TableHead>
                          <TableHead>Carriers</TableHead>
                          <TableHead>Prioriteit</TableHead>
                          <TableHead>Gem. Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPools.map((pool) => (
                          <TableRow 
                            key={pool.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedPool(pool)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{pool.name}</div>
                                  <div className="text-sm text-muted-foreground">{pool.description}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {pool.carrier_pool_members?.length || 0} carriers
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-amber-500" />
                                {pool.priority || 0}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const avgScore = getPoolAvgScore(pool);
                                return (
                                  <span className={avgScore >= 90 ? "text-emerald-600 font-medium" : avgScore >= 80 ? "text-amber-600" : "text-destructive"}>
                                    {avgScore > 0 ? `${avgScore}%` : '-'}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pool.is_active ? "default" : "secondary"}>
                                {pool.is_active ? "Actief" : "Inactief"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    deletePool(pool.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedPool(pool)}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pool Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedPool ? selectedPool.name : "Pool Details"}
                </CardTitle>
                <CardDescription>
                  {selectedPool ? selectedPool.description : "Selecteer een pool om details te zien"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPool ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">CARRIERS IN POOL</Label>
                      <div className="mt-2 space-y-2">
                        {(selectedPool.carrier_pool_members || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Nog geen carriers in deze pool
                          </p>
                        ) : (
                          selectedPool.carrier_pool_members?.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{member.carrier?.company_name || 'Onbekend'}</span>
                                {member.carrier?.rating && (
                                  <Badge variant="outline" className="text-xs">
                                    {member.carrier.rating}%
                                  </Badge>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => handleRemoveCarrier(member.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => setIsAddCarrierOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Carrier Toevoegen
                    </Button>
                    
                    {/* Add Carrier Dialog */}
                    <Dialog open={isAddCarrierOpen} onOpenChange={setIsAddCarrierOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Carrier toevoegen aan {selectedPool.name}</DialogTitle>
                          <DialogDescription>Selecteer een carrier om toe te voegen aan deze pool.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Zoek carrier..."
                            value={carrierSearch}
                            onChange={(e) => setCarrierSearch(e.target.value)}
                          />
                          <ScrollArea className="h-[200px]">
                            {isLoadingCarriers ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {filteredAvailableCarriers.map((carrier) => (
                                  <div 
                                    key={carrier.id} 
                                    className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted cursor-pointer"
                                    onClick={() => handleAddCarrier(carrier.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{carrier.company_name}</span>
                                    </div>
                                    {carrier.rating && (
                                      <Badge variant="outline">{carrier.rating}%</Badge>
                                    )}
                                  </div>
                                ))}
                                {filteredAvailableCarriers.length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    {availableCarriers.length === 0 
                                      ? "Geen carriers beschikbaar. Voeg eerst carriers toe."
                                      : "Geen carriers gevonden"
                                    }
                                  </p>
                                )}
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Klik op een pool om de carriers te beheren.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CarrierPools;
