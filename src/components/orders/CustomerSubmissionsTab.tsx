import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyCustomerStatusChange } from "@/lib/customerNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface CustomerSubmission {
  id: string;
  customer_id: string;
  status: string;
  reference_number: string | null;
  converted_trip_id: string | null;
  pickup_company: string;
  pickup_address: string;
  pickup_city: string;
  pickup_postal_code: string | null;
  pickup_date: string;
  pickup_time_from: string | null;
  pickup_time_to: string | null;
  pickup_flexible: boolean;
  pickup_contact_person: string | null;
  pickup_phone: string | null;
  pickup_email: string | null;
  delivery_company: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postal_code: string | null;
  delivery_date: string | null;
  delivery_time_from: string | null;
  delivery_time_to: string | null;
  delivery_flexible: boolean;
  delivery_contact_person: string | null;
  delivery_phone: string | null;
  delivery_email: string | null;
  product_description: string | null;
  quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  special_instructions: string | null;
  created_at: string;
  customers?: { company_name: string } | null;
}

interface CustomerSubmissionsTabProps {
  onSubmissionCountChange?: (count: number) => void;
}

const CustomerSubmissionsTab = ({ onSubmissionCountChange }: CustomerSubmissionsTabProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<CustomerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<CustomerSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("customer_submissions")
        .select(`
          *,
          customers(company_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSubmissions((data || []) as unknown as CustomerSubmission[]);
      
      // Count pending for badge
      if (statusFilter === "pending") {
        onSubmissionCountChange?.(data?.length || 0);
      } else {
        const { count } = await supabase
          .from("customer_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        onSubmissionCountChange?.(count || 0);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({ title: "Fout bij ophalen aanvragen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: CustomerSubmission) => {
    setProcessingId(submission.id);
    try {
      // Trip already exists via database trigger — just update its status to 'gepland'
      if (!submission.converted_trip_id) {
        throw new Error("Geen gekoppelde trip gevonden. De automatische koppeling is mogelijk mislukt.");
      }

      // 1. Update trip status from 'aanvraag' to 'gepland'
      const { error: tripError } = await supabase
        .from("trips")
        .update({ status: "gepland" as any })
        .eq("id", submission.converted_trip_id);

      if (tripError) throw tripError;

      // 2. Update submission status
      const { error: updateError } = await supabase
        .from("customer_submissions")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", submission.id);

      if (updateError) throw updateError;

      // 3. Fetch trip data for notifications
      const { data: tripData } = await supabase
        .from("trips")
        .select("order_number")
        .eq("id", submission.converted_trip_id)
        .single();

      const orderNumber = tripData?.order_number || submission.converted_trip_id.slice(0, 8).toUpperCase();

      // 4. Log order event for audit trail
      supabase.from("order_events").insert({
        order_id: submission.converted_trip_id,
        event_type: "STATUS_UPDATED",
        payload: { old_value: "aanvraag", new_value: "gepland", source: "submission_approve" },
        actor_user_id: user?.id,
      }).then(({ error }) => { if (error) console.error("[OrderEvent] insert failed:", error); });

      // 5. Notify B2B customer via push
      notifyCustomerStatusChange(submission.customer_id, submission.converted_trip_id, "gepland", orderNumber);

      // 6. Send confirmation email (if email is available)
      if (submission.pickup_email || submission.delivery_email) {
        try {
          await supabase.functions.invoke("send-order-confirmation", {
            body: {
              customerEmail: submission.pickup_email || submission.delivery_email,
              customerName: submission.pickup_contact_person || submission.pickup_company,
              orderNumber,
              pickupAddress: `${submission.pickup_address}, ${submission.pickup_city}`,
              pickupDate: submission.pickup_date,
              pickupTimeSlot: submission.pickup_flexible 
                ? "Flexibel" 
                : `${submission.pickup_time_from || ""} - ${submission.pickup_time_to || ""}`,
              deliveryAddress: `${submission.delivery_address}, ${submission.delivery_city}`,
              deliveryDate: submission.delivery_date || submission.pickup_date,
              deliveryTimeSlot: submission.delivery_flexible 
                ? "Flexibel" 
                : `${submission.delivery_time_from || ""} - ${submission.delivery_time_to || ""}`,
              language: "nl",
            },
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }

      toast({ title: "Aanvraag goedgekeurd — order status is nu 'Gepland'" });
      fetchSubmissions();
    } catch (error) {
      console.error("Error approving submission:", error);
      toast({ title: "Fout bij goedkeuren", description: String(error), variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (submission: CustomerSubmission) => {
    setSelectedSubmission(submission);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    setProcessingId(selectedSubmission.id);
    try {
      // 1. Cancel the auto-created trip if it exists
      if (selectedSubmission.converted_trip_id) {
        const { error: tripError } = await supabase
          .from("trips")
          .update({ status: "geannuleerd" as any })
          .eq("id", selectedSubmission.converted_trip_id);

        if (tripError) {
          console.error("Error cancelling trip:", tripError);
        }

        // Log order event for audit trail
        supabase.from("order_events").insert({
          order_id: selectedSubmission.converted_trip_id,
          event_type: "STATUS_UPDATED",
          payload: { old_value: "aanvraag", new_value: "geannuleerd", source: "submission_reject", reason: rejectionReason || "Geen reden opgegeven" },
          actor_user_id: user?.id,
        }).then(({ error }) => { if (error) console.error("[OrderEvent] insert failed:", error); });

        // Notify B2B customer via push
        notifyCustomerStatusChange(selectedSubmission.customer_id, selectedSubmission.converted_trip_id, "geannuleerd", null);
      }

      // 2. Update submission status
      const { error } = await supabase
        .from("customer_submissions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || "Geen reden opgegeven",
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // 3. Send rejection email
      const customerEmail = selectedSubmission.pickup_email || selectedSubmission.delivery_email;
      if (customerEmail) {
        try {
          let orderNumber = selectedSubmission.converted_trip_id?.slice(0, 8).toUpperCase() || '-';
          if (selectedSubmission.converted_trip_id) {
            const { data: tripData } = await supabase
              .from("trips")
              .select("order_number")
              .eq("id", selectedSubmission.converted_trip_id)
              .single();
            if (tripData?.order_number) orderNumber = tripData.order_number;
          }
          await supabase.functions.invoke("send-order-rejection", {
            body: {
              customerEmail,
              customerName: selectedSubmission.pickup_contact_person || selectedSubmission.pickup_company,
              orderNumber,
              rejectionReason: rejectionReason || "Geen reden opgegeven",
              language: "nl",
            },
          });
        } catch (emailError) {
          console.error("Rejection email sending failed:", emailError);
        }
      }

      toast({ title: "Aanvraag afgewezen — gekoppelde order geannuleerd" });
      setRejectDialogOpen(false);
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast({ title: "Fout bij afwijzen", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Wachtend</Badge>;
      case "approved":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Goedgekeurd</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Afgewezen</Badge>;
      case "converted":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Omgezet</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimeWindow = (from: string | null, to: string | null, flexible: boolean) => {
    if (flexible) return "Flexibel";
    if (!from && !to) return "-";
    return `${from || ""} - ${to || ""}`;
  };

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "pending" && <Clock className="mr-1 h-3 w-3" />}
            {status === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}
            {status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
            {status === "pending" && "Wachtend"}
            {status === "approved" && "Goedgekeurd"}
            {status === "rejected" && "Afgewezen"}
            {status === "all" && "Alles"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Geen aanvragen gevonden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Status</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Referentie</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Ophalen
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Afleveren
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Zending
                      </div>
                    </TableHead>
                    <TableHead>Aangevraagd</TableHead>
                    <TableHead className="w-32">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {submission.customers?.company_name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {submission.reference_number || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{submission.pickup_company}</div>
                          <div className="text-muted-foreground">
                            {submission.pickup_address}, {submission.pickup_city}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(submission.pickup_date), "dd-MM-yyyy", { locale: nl })}
                            {" • "}
                            {formatTimeWindow(
                              submission.pickup_time_from,
                              submission.pickup_time_to,
                              submission.pickup_flexible
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{submission.delivery_company}</div>
                          <div className="text-muted-foreground">
                            {submission.delivery_address}, {submission.delivery_city}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.delivery_date
                              ? format(new Date(submission.delivery_date), "dd-MM-yyyy", { locale: nl })
                              : "-"}
                            {" • "}
                            {formatTimeWindow(
                              submission.delivery_time_from,
                              submission.delivery_time_to,
                              submission.delivery_flexible
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{submission.product_description || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {submission.quantity && `${submission.quantity}x`}
                            {submission.weight_kg && ` • ${submission.weight_kg}kg`}
                            {submission.volume_m3 && ` • ${submission.volume_m3}m³`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(submission.created_at), "dd-MM-yyyy HH:mm", { locale: nl })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {submission.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(submission)}
                              disabled={processingId === submission.id}
                            >
                              {processingId === submission.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => openRejectDialog(submission)}
                              disabled={processingId === submission.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanvraag afwijzen</DialogTitle>
            <DialogDescription>
              Geef een reden op voor het afwijzen van deze aanvraag. De klant zal hiervan op de hoogte worden gesteld.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reden voor afwijzing..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId !== null}
            >
              {processingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSubmissionsTab;
