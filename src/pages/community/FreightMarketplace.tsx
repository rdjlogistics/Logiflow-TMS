import { useState } from "react";
import { 
  Package, 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Eye,
  MessageCircle,
  Check,
  X,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  useFreightListings, 
  useMyListings, 
  useFreightMatches,
  useFindMatches,
  FreightListing,
  FreightMatch,
} from "@/hooks/useFreightMarketplace";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { ListingDetailDrawer } from "@/components/marketplace/ListingDetailDrawer";
import { MatchCard } from "@/components/marketplace/MatchCard";

const vehicleTypeLabels: Record<string, string> = {
  bakwagen: "Bakwagen",
  trekker: "Trekker",
  vrachtwagen: "Vrachtwagen",
  bestelbus: "Bestelbus",
  koelwagen: "Koelwagen",
  dieplader: "Dieplader",
  containerwagen: "Containerwagen",
};

const priceTypeLabels: Record<string, string> = {
  fixed: "Vaste prijs",
  negotiable: "Onderhandelbaar",
  per_km: "Per km",
};

const FreightMarketplace = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "capacity" | "load">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<FreightListing | null>(null);
  const [createType, setCreateType] = useState<"capacity" | "load">("capacity");

  const { data: listings = [], isLoading: listingsLoading, refetch: refetchListings } = useFreightListings({
    type: typeFilter,
  });
  const { data: myListings = [], isLoading: myListingsLoading } = useMyListings();
  const { data: matches = [], isLoading: matchesLoading } = useFreightMatches();
  const { findMatches, isMatching } = useFindMatches();

  const filteredListings = listings.filter(listing => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      listing.origin_city.toLowerCase().includes(search) ||
      listing.destination_city.toLowerCase().includes(search) ||
      listing.goods_type?.toLowerCase().includes(search) ||
      listing.vehicle_type?.toLowerCase().includes(search)
    );
  });

  const handleCreateListing = (type: "capacity" | "load") => {
    setCreateType(type);
    setCreateDialogOpen(true);
  };

  const handleFindMatches = async (listingId: string) => {
    await findMatches(listingId);
  };

  const stats = {
    activeListings: listings.length,
    capacityListings: listings.filter(l => l.listing_type === 'capacity').length,
    loadListings: listings.filter(l => l.listing_type === 'load').length,
    myActiveListings: myListings.filter(l => l.status === 'active').length,
    pendingMatches: matches.filter(m => m.status === 'suggested').length,
  };

  return (
    <DashboardLayout title="Freight Marketplace" description="AI-gestuurde vrachtbeurs voor het matchen van lading en capaciteit">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Freight Marketplace
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-gestuurde vrachtbeurs • Reduceer lege kilometers • Vind de perfecte match
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleCreateListing("capacity")}
              className="gap-2"
            >
              <Truck className="h-4 w-4" />
              Capaciteit Aanbieden
            </Button>
            <Button 
              onClick={() => handleCreateListing("load")}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Lading Plaatsen
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeListings}</p>
                  <p className="text-xs text-muted-foreground">Actieve Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.capacityListings}</p>
                  <p className="text-xs text-muted-foreground">Capaciteit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.loadListings}</p>
                  <p className="text-xs text-muted-foreground">Ladingen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.myActiveListings}</p>
                  <p className="text-xs text-muted-foreground">Mijn Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingMatches}</p>
                  <p className="text-xs text-muted-foreground">AI Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse" className="gap-2">
              <Search className="h-4 w-4" />
              Bladeren
            </TabsTrigger>
            <TabsTrigger value="my-listings" className="gap-2">
              <Package className="h-4 w-4" />
              Mijn Listings
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Matches
              {stats.pendingMatches > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.pendingMatches}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4">
            {/* Filters */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Zoek op stad, goederentype, voertuig..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={typeFilter === "all" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("all")}
                    >
                      Alles
                    </Button>
                    <Button
                      variant={typeFilter === "capacity" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("capacity")}
                      className="gap-1"
                    >
                      <Truck className="h-4 w-4" />
                      Capaciteit
                    </Button>
                    <Button
                      variant={typeFilter === "load" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("load")}
                      className="gap-1"
                    >
                      <Package className="h-4 w-4" />
                      Ladingen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchListings()}
                      className="gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Listings Grid */}
            {listingsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-48 bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Geen listings gevonden</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Er zijn momenteel geen actieve listings die aan je zoekcriteria voldoen.
                  </p>
                  <Button onClick={() => handleCreateListing("capacity")}>
                    Plaats de eerste listing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing}
                    onView={() => setSelectedListing(listing)}
                    onFindMatches={() => handleFindMatches(listing.id)}
                    isMatching={isMatching}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="my-listings" className="space-y-4">
            {myListingsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-48 bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nog geen listings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Begin met het aanbieden van capaciteit of het plaatsen van een lading.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => handleCreateListing("capacity")}>
                      <Truck className="h-4 w-4 mr-2" />
                      Capaciteit Aanbieden
                    </Button>
                    <Button onClick={() => handleCreateListing("load")}>
                      <Package className="h-4 w-4 mr-2" />
                      Lading Plaatsen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing}
                    onView={() => setSelectedListing(listing)}
                    onFindMatches={() => handleFindMatches(listing.id)}
                    isMatching={isMatching}
                    isOwn
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            {matchesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-32 bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nog geen AI matches</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Plaats een listing en laat AI de beste matches voor je vinden.
                  </p>
                  <Button onClick={() => setActiveTab("my-listings")}>
                    Bekijk mijn listings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateListingDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={createType}
      />

      <ListingDetailDrawer
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        onFindMatches={handleFindMatches}
        isMatching={isMatching}
      />
    </DashboardLayout>
  );
};

// Listing Card Component
function ListingCard({ 
  listing, 
  onView, 
  onFindMatches,
  isMatching,
  isOwn = false 
}: { 
  listing: FreightListing;
  onView: () => void;
  onFindMatches: () => void;
  isMatching: boolean;
  isOwn?: boolean;
}) {
  const isCapacity = listing.listing_type === 'capacity';

  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Badge 
            variant={isCapacity ? "default" : "secondary"}
            className={isCapacity ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}
          >
            {isCapacity ? (
              <><Truck className="h-3 w-3 mr-1" /> Capaciteit</>
            ) : (
              <><Package className="h-3 w-3 mr-1" /> Lading</>
            )}
          </Badge>
          {listing.price_amount && (
            <span className="text-lg font-bold text-primary">
              €{listing.price_amount.toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3" onClick={onView}>
        {/* Route */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="font-medium truncate">{listing.origin_city}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="font-medium truncate">{listing.destination_city}</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(listing.pickup_date), "d MMM yyyy", { locale: nl })}
          </span>
          {listing.vehicle_type && (
            <>
              <span>•</span>
              <Truck className="h-4 w-4" />
              <span>{vehicleTypeLabels[listing.vehicle_type] || listing.vehicle_type}</span>
            </>
          )}
        </div>

        {/* Capacity */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          {listing.weight_kg && (
            <span>{listing.weight_kg.toLocaleString()} kg</span>
          )}
          {listing.volume_m3 && (
            <span>{listing.volume_m3} m³</span>
          )}
          {listing.loading_meters && (
            <span>{listing.loading_meters} ldm</span>
          )}
        </div>

        {/* Company */}
        {listing.company && (
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
            {listing.company.name} • {listing.company.city}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="h-3 w-3" />
            Details
          </Button>
          {isOwn && (
            <Button 
              size="sm" 
              className="flex-1 gap-1" 
              onClick={(e) => { e.stopPropagation(); onFindMatches(); }}
              disabled={isMatching}
            >
              <Sparkles className="h-3 w-3" />
              {isMatching ? 'Zoeken...' : 'Vind Matches'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default FreightMarketplace;
