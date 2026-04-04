import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UsersRound, Search, Building2, Phone, Mail, Globe, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const CommunityWorkspaces = () => {
  const [search, setSearch] = useState("");

  // Use carriers as partner network (existing table)
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["community-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, company_name, contact_name, email, phone, city, country, is_active, rating, vehicle_types")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = partners.filter(p =>
    p.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Community Workspaces">
      <FeatureGate feature="vervoerders_netwerk">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{partners.length}</div>
              <p className="text-xs text-muted-foreground">Actieve Partners</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{partners.filter(p => p.rating && p.rating >= 4).length}</div>
              <p className="text-xs text-muted-foreground">Top-rated</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{new Set(partners.map(p => p.city).filter(Boolean)).size}</div>
              <p className="text-xs text-muted-foreground">Steden</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{new Set(partners.flatMap(p => p.vehicle_types || [])).size}</div>
              <p className="text-xs text-muted-foreground">Voertuigtypen</p>
            </CardContent></Card>
          </div>

          {/* Partners Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /> Partner Netwerk</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Zoek partner..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Geen partners gevonden</p>
                  <p className="text-sm">Voeg vervoerders toe via het Carriers overzicht</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bedrijf</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead className="hidden sm:table-cell">Locatie</TableHead>
                        <TableHead className="hidden md:table-cell">Voertuigen</TableHead>
                        <TableHead>Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <div>
                              {p.company_name}
                              {p.email && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" />{p.email}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              {p.contact_name || "-"}
                              {p.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {p.city ? <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{p.city}{p.country ? `, ${p.country}` : ""}</span> : "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(p.vehicle_types || []).slice(0, 3).map((vt: string) => (
                                <Badge key={vt} variant="outline" className="text-xs">{vt}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.rating ? <Badge variant={p.rating >= 4 ? "default" : "secondary"}>{p.rating}/5</Badge> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunityWorkspaces;
