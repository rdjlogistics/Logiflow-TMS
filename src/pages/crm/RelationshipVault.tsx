import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, Search, Star, Users, Trophy, Gift, 
  Sparkles, Clock, Edit, Mail, Building2
} from "lucide-react";
import { useRelationshipVault, RelationshipTier, RelationshipProfile } from "@/hooks/useRelationshipVault";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const tierConfig: Record<RelationshipTier, { label: string; color: string; icon: React.ReactNode }> = {
  STRATEGIC: { label: 'Strategisch', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', icon: <Trophy className="h-3 w-3" /> },
  CORE: { label: 'Kern', color: 'bg-primary/10 text-primary border-primary/30', icon: <Star className="h-3 w-3" /> },
  STANDARD: { label: 'Standaard', color: 'bg-muted text-muted-foreground border-border', icon: <Users className="h-3 w-3" /> },
};

const RelationshipVault = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedProfile, setSelectedProfile] = useState<RelationshipProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { 
    profiles, 
    profilesLoading, 
    upsertProfile,
    moments,
    giftOrders,
  } = useRelationshipVault();

  // Get customers to join with profiles
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-vault'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, email, phone, city');
      if (error) throw error;
      return data;
    },
  });

  const enrichedProfiles = profiles.map(profile => {
    const customer = customers.find(c => c.id === profile.account_id);
    const accountMoments = moments.filter(m => m.account_id === profile.account_id);
    const accountGifts = giftOrders.filter(g => g.account_id === profile.account_id);
    return { 
      ...profile, 
      customer,
      momentsCount: accountMoments.length,
      giftsCount: accountGifts.length,
      pendingMoments: accountMoments.filter(m => m.status === 'SUGGESTED').length,
    };
  });

  const filteredProfiles = enrichedProfiles.filter(profile => {
    const matchesSearch = !searchQuery || 
      profile.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "all" || profile.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const handleSaveProfile = async (data: Partial<RelationshipProfile>) => {
    if (!selectedProfile) return;
    await upsertProfile.mutateAsync({ ...data, account_id: selectedProfile.account_id });
    setEditDialogOpen(false);
  };

  return (
    <DashboardLayout title="Relationship Vault">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Heart className="h-8 w-8 text-rose-500" />
              Relationship Vault
            </h1>
            <p className="text-muted-foreground mt-1">
              Beheer strategische relaties met klanten
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const suggestions = [
                `${profiles.filter(p => p.tier === 'STANDARD').length} standaard klanten kunnen mogelijk naar Kern tier`,
                `${moments.filter(m => m.status === 'SUGGESTED').length} momenten wachten op actie`,
                `Top klant score: ${Math.max(...profiles.map(p => p.relationship_score_0_100 || 0))}/100`,
              ];
              toast({ 
                title: "AI Analyse voltooid ✓", 
                description: suggestions.join(' | '),
              });
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Suggesties
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Strategisch</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {profiles.filter(p => p.tier === 'STRATEGIC').length}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kern</p>
                  <p className="text-2xl font-bold text-primary">
                    {profiles.filter(p => p.tier === 'CORE').length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Openstaande Momenten</p>
                  <p className="text-2xl font-bold">
                    {moments.filter(m => m.status === 'SUGGESTED').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verzonden Cadeaus</p>
                  <p className="text-2xl font-bold text-rose-500">
                    {giftOrders.filter(g => g.status === 'DELIVERED').length}
                  </p>
                </div>
                <Gift className="h-8 w-8 text-rose-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op klant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle tiers</SelectItem>
                  <SelectItem value="STRATEGIC">Strategisch</SelectItem>
                  <SelectItem value="CORE">Kern</SelectItem>
                  <SelectItem value="STANDARD">Standaard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Profiles List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {profilesLoading ? (
            <Card className="col-span-2">
              <CardContent className="py-8 text-center text-muted-foreground">
                Laden...
              </CardContent>
            </Card>
          ) : filteredProfiles.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="py-8 text-center text-muted-foreground">
                Geen relatieprofielen gevonden
              </CardContent>
            </Card>
          ) : (
            filteredProfiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold">
                        {profile.customer?.company_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {profile.customer?.company_name || 'Onbekend'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={tierConfig[profile.tier].color}>
                            {tierConfig[profile.tier].icon}
                            <span className="ml-1">{tierConfig[profile.tier].label}</span>
                          </Badge>
                          {profile.pendingMoments > 0 && (
                            <Badge variant="secondary">
                              {profile.pendingMoments} moment{profile.pendingMoments !== 1 ? 'en' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {profile.customer?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {profile.customer.email}
                            </span>
                          )}
                          {profile.customer?.city && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {profile.customer.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedProfile(profile);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Relationship Score */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Relatiescore</span>
                      <span className="font-medium">{profile.relationship_score_0_100}/100</span>
                    </div>
                    <Progress value={profile.relationship_score_0_100} className="h-2" />
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {profile.momentsCount} momenten
                    </div>
                    <div className="flex items-center gap-1 text-rose-500">
                      <Gift className="h-4 w-4" />
                      {profile.giftsCount} cadeaus
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Relatieprofiel Bewerken</DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-4">
                <div>
                  <Label>Tier</Label>
                  <Select 
                    value={selectedProfile.tier} 
                    onValueChange={(value) => setSelectedProfile({ ...selectedProfile, tier: value as RelationshipTier })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRATEGIC">Strategisch</SelectItem>
                      <SelectItem value="CORE">Kern</SelectItem>
                      <SelectItem value="STANDARD">Standaard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Relatiescore (0-100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedProfile.relationship_score_0_100}
                    onChange={(e) => setSelectedProfile({ 
                      ...selectedProfile, 
                      relationship_score_0_100: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button 
                    onClick={() => handleSaveProfile(selectedProfile)}
                    disabled={upsertProfile.isPending}
                  >
                    Opslaan
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RelationshipVault;
