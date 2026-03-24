import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import {
  Loader2,
  Search,
  Link as LinkIcon,
  Unlink,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";

interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

const CustomerUserLinking = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [filterLinked, setFilterLinked] = useState<string>("all");
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [customerToUnlink, setCustomerToUnlink] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name, contact_name, email, phone, user_id")
        .order("company_name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({ title: "Fout bij ophalen klanten", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles to get user emails
      // Note: We can't directly access auth.users, so we work with profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (error) throw error;

      // Get user roles to filter only customer-type users or unlinked users
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Create a map of user_id to role
      const roleMap = new Map(userRoles?.map(r => [r.user_id, r.role]) || []);

      // For now, we'll use profiles as our user list
      // In a real app, you might have a separate edge function to fetch auth users
      const usersFromProfiles: AuthUser[] = (profiles || []).map(p => ({
        id: p.user_id,
        email: p.full_name || p.user_id.slice(0, 8),
        created_at: new Date().toISOString(),
      }));

      setUsers(usersFromProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleLinkUser = async () => {
    if (!selectedCustomer || !selectedUserId) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ user_id: selectedUserId })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      // Note: Customer access is controlled via the customer.user_id relationship,
      // not via user_roles. The RLS policies check if user_id matches auth.uid().

      toast({ title: "Klant gekoppeld aan gebruiker" });
      setLinkDialogOpen(false);
      setSelectedCustomer(null);
      setSelectedUserId("");
      fetchCustomers();
    } catch (error) {
      console.error("Error linking user:", error);
      toast({ title: "Fout bij koppelen", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlinkClick = (customer: Customer) => {
    setCustomerToUnlink(customer);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!customerToUnlink) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ user_id: null })
        .eq("id", customerToUnlink.id);

      if (error) throw error;

      toast({ title: "Koppeling verwijderd" });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Fout bij ontkoppelen", variant: "destructive" });
    } finally {
      setProcessing(false);
      setUnlinkDialogOpen(false);
      setCustomerToUnlink(null);
    }
  };

  const openLinkDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedUserId("");
    setLinkDialogOpen(true);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterLinked === "linked") return matchesSearch && c.user_id;
    if (filterLinked === "unlinked") return matchesSearch && !c.user_id;
    return matchesSearch;
  });

  const linkedCount = customers.filter(c => c.user_id).length;
  const unlinkedCount = customers.filter(c => !c.user_id).length;

  // Get users that are not already linked to a customer
  const availableUsers = users.filter(u => 
    !customers.some(c => c.user_id === u.id) || 
    (selectedCustomer && selectedCustomer.user_id === u.id)
  );

  return (
    <DashboardLayout title="Klant-Gebruiker Koppeling">
      <div className="space-y-6 animate-fade-in">
        {/* Header with stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totaal Klanten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Gekoppeld
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{linkedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserX className="h-4 w-4 text-orange-500" />
                Niet Gekoppeld
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unlinkedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Info card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Over Klant Portal Toegang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Klanten met een gekoppeld gebruikersaccount kunnen inloggen op het Klanten Portaal om zendingen aan te vragen. 
              Zij kunnen alleen hun eigen aanvragen zien en beheren.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek klanten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterLinked === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLinked("all")}
            >
              Alle ({customers.length})
            </Button>
            <Button
              variant={filterLinked === "linked" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLinked("linked")}
            >
              <UserCheck className="mr-1 h-3 w-3" />
              Gekoppeld ({linkedCount})
            </Button>
            <Button
              variant={filterLinked === "unlinked" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLinked("unlinked")}
            >
              <UserX className="mr-1 h-3 w-3" />
              Niet gekoppeld ({unlinkedCount})
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Geen klanten gevonden
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Bedrijfsnaam</TableHead>
                    <TableHead>Contactpersoon</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefoon</TableHead>
                    <TableHead>Portal Status</TableHead>
                    <TableHead className="w-32">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.company_name}
                      </TableCell>
                      <TableCell>{customer.contact_name || "-"}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {customer.email || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {customer.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {customer.user_id ? (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Gekoppeld
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <UserX className="mr-1 h-3 w-3" />
                            Niet gekoppeld
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.user_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleUnlinkClick(customer)}
                            disabled={processing}
                          >
                            <Unlink className="mr-1 h-4 w-4" />
                            Ontkoppel
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLinkDialog(customer)}
                            disabled={processing}
                          >
                            <LinkIcon className="mr-1 h-4 w-4" />
                            Koppel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Link dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gebruiker koppelen aan klant</DialogTitle>
              <DialogDescription>
                Selecteer een gebruikersaccount om te koppelen aan{" "}
                <strong>{selectedCustomer?.company_name}</strong>. 
                Deze gebruiker krijgt dan toegang tot het Klanten Portaal.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Gebruiker</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een gebruiker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Geen beschikbare gebruikers
                      </div>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <p className="text-sm text-muted-foreground">
                💡 Tip: De gebruiker moet eerst een account aanmaken via de login pagina 
                voordat je deze kunt koppelen aan een klant.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleLinkUser}
                disabled={!selectedUserId || processing}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="mr-2 h-4 w-4" />
                )}
                Koppelen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={unlinkDialogOpen}
          onOpenChange={setUnlinkDialogOpen}
          title="Koppeling verwijderen"
          description={`Weet je zeker dat je de koppeling voor ${customerToUnlink?.company_name || "deze klant"} wilt verwijderen?`}
          onConfirm={handleUnlinkConfirm}
          isLoading={processing}
          confirmText="Ontkoppelen"
        />
      </div>
    </DashboardLayout>
  );
};

export default CustomerUserLinking;
