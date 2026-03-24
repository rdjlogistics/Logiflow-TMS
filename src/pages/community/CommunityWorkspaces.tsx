import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, UsersRound, Settings, UserPlus, Building2, Search, Mail, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Placeholder data - will be replaced with real data from hooks
const mockWorkspaces = [
  {
    id: "1",
    name: "Benelux Courier Partners",
    description: "Samenwerkingsverband voor courier diensten in de Benelux",
    memberCount: 5,
    role: "owner",
    activeOrders: 12,
    pendingSettlements: 3,
  },
  {
    id: "2",
    name: "XL Transport Groep",
    description: "Gezamenlijke XL transport opdrachten",
    memberCount: 3,
    role: "admin",
    activeOrders: 8,
    pendingSettlements: 1,
  },
  {
    id: "3",
    name: "Last Mile Network",
    description: "Last mile delivery netwerk",
    memberCount: 12,
    role: "member",
    activeOrders: 45,
    pendingSettlements: 7,
  },
];

const CommunityWorkspaces = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<typeof mockWorkspaces[0] | null>(null);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const filteredWorkspaces = mockWorkspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) {
      toast({
        title: "Fout",
        description: "Vul een naam in voor de workspace",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Workspace aangemaakt ✓",
      description: `${newWorkspace.name} is succesvol aangemaakt`,
    });
    setNewWorkspace({ name: "", description: "" });
    setIsCreateDialogOpen(false);
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({
        title: "Ongeldig e-mailadres",
        description: "Vul een geldig e-mailadres in",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Uitnodiging verstuurd ✓",
      description: `Uitnodiging is verzonden naar ${inviteEmail}`,
    });
    setInviteEmail("");
    setIsInviteDialogOpen(false);
    setSelectedWorkspace(null);
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${selectedWorkspace?.id}`;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    toast({
      title: "Link gekopieerd ✓",
      description: "Uitnodigingslink is gekopieerd naar klembord",
    });
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleOpenSettings = (workspace: typeof mockWorkspaces[0]) => {
    navigate(`/community/workspaces?settings=${workspace.id}`);
    toast({
      title: `${workspace.name} Instellingen`,
      description: "Instellingen: Leden beheren, rechten, factuurinstellingen, en notificaties. (Demo)",
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-violet-500/20 text-violet-600 border-violet-500/30">Eigenaar</Badge>;
      case "admin":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Admin</Badge>;
      default:
        return <Badge variant="secondary">Lid</Badge>;
    }
  };

  return (
    <DashboardLayout title="Community Workspaces">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community Workspaces</h1>
            <p className="text-muted-foreground">
              Beheer je samenwerkingsverbanden met andere transportbedrijven
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuwe Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Workspace Aanmaken</DialogTitle>
                <DialogDescription>
                  Maak een nieuwe workspace aan om samen te werken met andere bedrijven
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    placeholder="Bijv. Benelux Courier Partners"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschrijving</Label>
                  <Textarea
                    id="description"
                    placeholder="Omschrijf het doel van deze workspace..."
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleCreateWorkspace}>Aanmaken</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Workspaces</CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockWorkspaces.length}</div>
              <p className="text-xs text-muted-foreground">Actieve samenwerkingen</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Orders</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockWorkspaces.reduce((sum, ws) => sum + ws.activeOrders, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Gezamenlijke ritten</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Openstaande Afrekeningen</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockWorkspaces.reduce((sum, ws) => sum + ws.pendingSettlements, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Te verwerken</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Workspaces Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mijn Workspaces</CardTitle>
            <CardDescription>
              Overzicht van alle workspaces waar je onderdeel van bent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Leden</TableHead>
                  <TableHead className="text-center">Actieve Orders</TableHead>
                  <TableHead className="text-center">Afrekeningen</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkspaces.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workspace.name}</div>
                        <div className="text-sm text-muted-foreground">{workspace.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(workspace.role)}</TableCell>
                    <TableCell className="text-center">{workspace.memberCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{workspace.activeOrders}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {workspace.pendingSettlements > 0 ? (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                          {workspace.pendingSettlements}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(workspace.role === "owner" || workspace.role === "admin") && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedWorkspace(workspace);
                              setIsInviteDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenSettings(workspace)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invite Member Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lid Uitnodigen</DialogTitle>
              <DialogDescription>
                Nodig een nieuw lid uit voor {selectedWorkspace?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="collega@bedrijf.nl"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">of</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deel uitnodigingslink</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`https://rdjlogistics.lovable.app/join/${selectedWorkspace?.id}`}
                    readOnly
                    className="text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyInviteLink}>
                    {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleInviteMember}>
                <Mail className="h-4 w-4 mr-2" />
                Verstuur Uitnodiging
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CommunityWorkspaces;
