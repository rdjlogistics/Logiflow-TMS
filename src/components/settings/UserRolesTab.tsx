import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Users, Shield, Loader2, UserCheck, UserPlus, Mail, Trash2, Send, Truck, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'medewerker' | 'chauffeur' | 'klant';

interface TenantUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole | null;
}

const ALL_ROLES: AppRole[] = ['admin', 'medewerker', 'chauffeur', 'klant'];

const ROLE_CONFIG: Record<AppRole, { label: string; description: string; color: string; icon: typeof Shield }> = {
  admin: {
    label: 'Beheerder',
    description: 'Volledige toegang tot alle functies, instellingen en gebruikersbeheer',
    color: 'bg-primary/15 text-primary border-primary/30',
    icon: Shield,
  },
  medewerker: {
    label: 'Planner',
    description: 'Orders, planning, ritten en klantbeheer',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: UserCheck,
  },
  chauffeur: {
    label: 'Chauffeur',
    description: 'Toegang tot de chauffeurs-app en eigen ritten',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Truck,
  },
  klant: {
    label: 'Klant',
    description: 'Toegang tot het klantenportaal en eigen zendingen',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Building2,
  },
};

type FilterKey = 'all' | 'staff' | 'chauffeur' | 'klant';

const ROLE_FILTERS: { key: FilterKey; label: string; roles?: AppRole[] }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'staff', label: 'Medewerkers', roles: ['admin', 'medewerker'] },
  { key: 'chauffeur', label: 'Chauffeurs', roles: ['chauffeur'] },
  { key: 'klant', label: 'Klanten', roles: ['klant'] },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function UserRolesTab() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole | ''>('');

  // Role edit state
  const [pendingRole, setPendingRole] = useState<Record<string, AppRole>>({});

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);

  // --- Query: fetch ALL tenant users (no role filter) ---
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users-roles'],
    queryFn: async (): Promise<TenantUser[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (!uc) return [];

      const { data: tenantUsers } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', uc.company_id);

      if (!tenantUsers?.length) return [];

      const userIds = tenantUsers.map(u => u.user_id);

      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
      ]);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return userIds.map(uid => ({
        user_id: uid,
        full_name: profileMap.get(uid)?.full_name || null,
        email: profileMap.get(uid)?.email || null,
        role: roleMap.get(uid) || null,
      }));
    },
  });

  // --- Filtered users based on active tab ---
  const activeFilterConfig = ROLE_FILTERS.find(f => f.key === activeFilter);
  const filteredUsers = activeFilter === 'all'
    ? users
    : users.filter(u => u.role !== null && activeFilterConfig?.roles?.includes(u.role));

  // --- Count per filter ---
  const getCounts = (key: FilterKey) => {
    if (key === 'all') return users.length;
    const cfg = ROLE_FILTERS.find(f => f.key === key);
    return users.filter(u => u.role !== null && cfg?.roles?.includes(u.role)).length;
  };

  // --- Mutation: invite user ---
  const inviteMutation = useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: AppRole }) => {
      const { data, error } = await supabase.functions.invoke('create-staff-account', {
        body: { full_name: name, email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users-roles'] });
      setInviteName('');
      setInviteEmail('');
      setInviteRole('');
      toast({ title: 'Uitnodiging verstuurd', description: 'De gebruiker ontvangt een e-mail met inloggegevens.' });
    },
    onError: (err: Error) => {
      console.error('Invite error:', err);
      toast({ title: 'Fout bij uitnodigen', description: err.message || 'Kon de uitnodiging niet versturen.', variant: 'destructive' });
    },
  });

  // --- Mutation: resend login ---
  const resendLoginMutation = useMutation({
    mutationFn: async (user: TenantUser) => {
      const { data, error } = await supabase.functions.invoke('create-staff-account', {
        body: { full_name: user.full_name || 'Gebruiker', email: user.email, role: user.role || 'medewerker' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Inloggegevens verstuurd', description: 'De gebruiker ontvangt een e-mail met nieuwe inloggegevens.' });
    },
    onError: (err: Error) => {
      console.error('Resend login error:', err);
      toast({ title: 'Fout bij verzenden', description: err.message || 'Kon de inloggegevens niet versturen.', variant: 'destructive' });
    },
  });

  // --- Mutation: update role ---
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Delete-then-insert: prevents maybeSingle() crashes and constraint violations
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
      if (insertError) throw insertError;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users-roles'] });
      setPendingRole(prev => { const next = { ...prev }; delete next[userId]; return next; });
      toast({ title: 'Rol bijgewerkt', description: 'De gebruikersrol is succesvol gewijzigd.' });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon de rol niet bijwerken.', variant: 'destructive' });
    },
  });

  // --- Mutation: delete user ---
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('remove-staff-account', {
        body: { target_user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users-roles'] });
      setDeleteTarget(null);
      toast({ title: 'Gebruiker verwijderd', description: 'Het account is gedeactiveerd en losgekoppeld.' });
    },
    onError: (err: Error) => {
      console.error('Delete error:', err);
      toast({ title: 'Fout bij verwijderen', description: err.message || 'Kon de gebruiker niet verwijderen.', variant: 'destructive' });
    },
  });

  // --- Form validation ---
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail);
  const isNameValid = inviteName.trim().length >= 2;
  const canSubmitInvite = isNameValid && isEmailValid && inviteRole !== '' && !inviteMutation.isPending;

  const handleInvite = () => {
    if (!canSubmitInvite) return;
    inviteMutation.mutate({ name: inviteName.trim(), email: inviteEmail.trim().toLowerCase(), role: inviteRole as AppRole });
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* --- Invite Card --- */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"
                whileHover={{ rotate: 10, scale: 1.1 }}
              >
                <UserPlus className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-base md:text-lg">Gebruiker uitnodigen</CardTitle>
                <CardDescription>Voeg een nieuwe gebruiker toe — medewerker, chauffeur of klant</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-xs font-medium text-muted-foreground">Volledige naam</Label>
                <Input
                  id="invite-name"
                  placeholder="Jan de Vries"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  error={inviteName.length > 0 && !isNameValid}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground">E-mailadres</Label>
                <Input
                  id="invite-email"
                  type="email"
                  icon={Mail}
                  placeholder="jan@bedrijf.nl"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  error={inviteEmail.length > 0 && !isEmailValid}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Rol</Label>
                <Select value={inviteRole} onValueChange={val => setInviteRole(val as AppRole)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Kies een rol…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map(key => {
                      const cfg = ROLE_CONFIG[key];
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col items-start py-0.5">
                            <span className="font-medium text-sm">{cfg.label}</span>
                            <span className="text-xs text-muted-foreground leading-tight">{cfg.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="mt-4 w-full sm:w-auto"
              onClick={handleInvite}
              disabled={!canSubmitInvite}
              loading={inviteMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Uitnodiging versturen
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Users Table --- */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"
                whileHover={{ rotate: 10, scale: 1.1 }}
              >
                <Users className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-base md:text-lg">Gebruikersbeheer</CardTitle>
                <CardDescription>Beheer alle accounts binnen je transportbedrijf</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter tabs */}
            <Tabs value={activeFilter} onValueChange={val => setActiveFilter(val as FilterKey)}>
              <TabsList className="w-full sm:w-auto">
                {ROLE_FILTERS.map(filter => (
                  <TabsTrigger key={filter.key} value={filter.key} className="text-xs sm:text-sm gap-1.5">
                    {filter.label}
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                      {getCounts(filter.key)}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Geen gebruikers gevonden in deze categorie.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Gebruiker</TableHead>
                      <TableHead className="font-semibold">E-mailadres</TableHead>
                      <TableHead className="font-semibold">Rol</TableHead>
                      <TableHead className="font-semibold text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => {
                      const isSelf = user.user_id === currentUser?.id;
                      const roleKey = pendingRole[user.user_id] || user.role;
                      const hasChange = pendingRole[user.user_id] && pendingRole[user.user_id] !== user.role;
                      const RoleIcon = user.role ? ROLE_CONFIG[user.role]?.icon || Shield : Shield;

                      return (
                        <TableRow key={user.user_id} className="hover:bg-muted/20">
                          {/* User info */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <RoleIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {user.full_name || 'Naamloos'}
                                  {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(jij)</span>}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Email */}
                          <TableCell>
                            <p className="text-sm text-muted-foreground">
                              {user.email || '—'}
                            </p>
                          </TableCell>

                          {/* Role badge */}
                          <TableCell>
                            {user.role && ROLE_CONFIG[user.role] ? (
                              <Badge variant="outline" className={cn('text-xs font-medium', ROLE_CONFIG[user.role].color)}>
                                <Shield className="h-3 w-3 mr-1" />
                                {ROLE_CONFIG[user.role].label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Geen rol</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end flex-wrap">
                              <Select
                                value={roleKey || ''}
                                onValueChange={val => setPendingRole(prev => ({ ...prev, [user.user_id]: val as AppRole }))}
                              >
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                  <SelectValue placeholder="Kies rol" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_ROLES.map(key => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                      {ROLE_CONFIG[key].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {hasChange && (
                                <Button
                                  size="sm"
                                  onClick={() => updateRoleMutation.mutate({ userId: user.user_id, newRole: pendingRole[user.user_id] })}
                                  loading={updateRoleMutation.isPending}
                                  className="text-xs h-9"
                                >
                                  Opslaan
                                </Button>
                              )}

                              {/* Resend login button */}
                              {!isSelf && user.email && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-9 gap-1.5"
                                  onClick={() => resendLoginMutation.mutate(user)}
                                  loading={resendLoginMutation.isPending}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Verzend inlog
                                </Button>
                              )}

                              {!isSelf && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Delete Dialog --- */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        title="Gebruiker verwijderen"
        description={`Weet je zeker dat je ${deleteTarget?.full_name || 'deze gebruiker'} wilt verwijderen? Het account wordt gedeactiveerd en losgekoppeld van je bedrijf.`}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.user_id); }}
        isLoading={deleteMutation.isPending}
        confirmText="Verwijderen"
        cancelText="Annuleren"
      />
    </motion.div>
  );
}
