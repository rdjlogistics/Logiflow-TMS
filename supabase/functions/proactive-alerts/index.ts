import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, alertId, notes, actionName, params } = await req.json();

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    const tenantId = profile?.company_id;

    if (action === "dismiss" || action === "resolve" || action === "execute") {
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const alerts: any[] = [];
    const now = new Date();

    if (tenantId) {
      // 1. Delayed trips: status 'onderweg' where trip_date + pickup_time is > 30 min ago
      const { data: inTransitTrips } = await supabase
        .from("trips")
        .select("id, order_number, status, trip_date, pickup_time_from, pickup_city, delivery_city")
        .eq("company_id", tenantId)
        .eq("status", "onderweg")
        .limit(10);

      if (inTransitTrips) {
        for (const trip of inTransitTrips) {
          if (!trip.trip_date) continue;
          // Combine trip_date with pickup_time_from for accurate delay calc
          let pickupDateTime: Date;
          if (trip.pickup_time_from) {
            pickupDateTime = new Date(`${trip.trip_date}T${trip.pickup_time_from}`);
          } else {
            pickupDateTime = new Date(`${trip.trip_date}T00:00:00`);
          }
          
          const delayMin = Math.round((now.getTime() - pickupDateTime.getTime()) / 60000);
          if (delayMin < 30) continue; // Only alert if > 30 min

          const label = trip.order_number || trip.id.slice(0, 8);
          alerts.push({
            id: `delay-${trip.id}`,
            title: `Rit ${label} vertraagd`,
            description: `${trip.pickup_city || "?"} → ${trip.delivery_city || "?"} is ${delayMin} min vertraagd`,
            severity: delayMin > 60 ? "critical" : "warning",
            category: "delay",
            createdAt: now.toISOString(),
            entityType: "trip",
            entityId: trip.id,
            actionRequired: true,
            suggestedActions: [
              { label: "Klant informeren", action: "notify_customer", params: { tripId: trip.id } },
              { label: "Bekijk rit", action: "view_trip", params: { tripId: trip.id } },
            ],
            aiConfidence: 0.9,
            dismissed: false,
          });
        }
      }

      // 2. Overdue invoices: unpaid invoices older than 14 days
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, due_date, customer_id")
        .eq("company_id", tenantId)
        .in("status", ["verzonden", "herinnering"])
        .lt("due_date", fourteenDaysAgo)
        .limit(10);

      if (overdueInvoices) {
        for (const inv of overdueInvoices) {
          if (!inv.due_date) continue;
          const daysOverdue = Math.round((now.getTime() - new Date(inv.due_date).getTime()) / (24 * 60 * 60 * 1000));
          alerts.push({
            id: `overdue-${inv.id}`,
            title: `Factuur ${inv.invoice_number || inv.id.slice(0, 8)} onbetaald`,
            description: `€${(inv.total_amount || 0).toFixed(2)} is ${daysOverdue} dagen over de vervaldatum`,
            severity: daysOverdue > 30 ? "critical" : "warning",
            category: "finance",
            createdAt: now.toISOString(),
            entityType: "invoice",
            entityId: inv.id,
            actionRequired: true,
            suggestedActions: [
              { label: "Herinnering sturen", action: "send_reminder", params: { invoiceId: inv.id } },
            ],
            aiConfidence: 1.0,
            dismissed: false,
          });
        }
      }

      // 3. Expiring driver documents (within 14 days) — filter via profiles for tenant
      const { data: tenantDrivers } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", tenantId)
        .eq("role", "driver");

      if (tenantDrivers && tenantDrivers.length > 0) {
        const driverIds = tenantDrivers.map(d => d.id);
        const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

        const { data: expiringDocs } = await supabase
          .from("driver_documents")
          .select("id, user_id, document_type, expiry_date")
          .in("user_id", driverIds)
          .lt("expiry_date", fourteenDaysFromNow)
          .gt("expiry_date", now.toISOString())
          .limit(10);

        if (expiringDocs) {
          for (const doc of expiringDocs) {
            const daysLeft = Math.round((new Date(doc.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            alerts.push({
              id: `doc-${doc.id}`,
              title: `Document verloopt over ${daysLeft} dagen`,
              description: `${doc.document_type || "Document"} voor chauffeur verloopt op ${new Date(doc.expiry_date).toLocaleDateString("nl-NL")}`,
              severity: daysLeft <= 3 ? "critical" : daysLeft <= 7 ? "warning" : "info",
              category: "compliance",
              createdAt: now.toISOString(),
              entityType: "driver",
              entityId: doc.user_id,
              actionRequired: daysLeft <= 7,
              suggestedActions: [
                { label: "Document vernieuwen", action: "renew_document", params: { docId: doc.id } },
              ],
              aiConfidence: 1.0,
              dismissed: false,
            });
          }
        }
      }

      // 4. Capacity: trips planned for today without a driver assigned
      const todayStr = now.toISOString().slice(0, 10);
      const { data: unassigned } = await supabase
        .from("trips")
        .select("id, order_number, pickup_city, delivery_city")
        .eq("company_id", tenantId)
        .in("status", ["gepland", "aanvraag"])
        .is("driver_id", null)
        .eq("trip_date", todayStr)
        .limit(10);

      if (unassigned && unassigned.length > 0) {
        alerts.push({
          id: `capacity-${todayStr}`,
          title: `${unassigned.length} rit(ten) zonder chauffeur vandaag`,
          description: `Er zijn ${unassigned.length} geplande ritten vandaag zonder toegewezen chauffeur`,
          severity: unassigned.length >= 3 ? "critical" : "warning",
          category: "capacity",
          createdAt: now.toISOString(),
          entityType: "trip",
          entityId: unassigned[0].id,
          actionRequired: true,
          suggestedActions: [
            { label: "Chauffeurs toewijzen", action: "assign_drivers" },
          ],
          aiConfidence: 0.95,
          dismissed: false,
        });
      }
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

    return new Response(JSON.stringify({ alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[proactive-alerts] Error:", error);
    return new Response(JSON.stringify({ alerts: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
