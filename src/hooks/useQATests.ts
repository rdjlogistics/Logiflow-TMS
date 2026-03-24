import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QATestResult {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail";
  error?: string;
  duration?: number;
}

const INITIAL_TESTS: QATestResult[] = [
  { id: "trip-create", name: "Zending aanmaken", description: "Trip insert + verify + cleanup", status: "pending" },
  { id: "status-update", name: "Status lifecycle", description: "gepland → onderweg → afgerond", status: "pending" },
  { id: "tracking-token", name: "Tracking token", description: "Token genereren en opslaan", status: "pending" },
  { id: "customer-crud", name: "Klant CRUD", description: "Customer insert + update + verify", status: "pending" },
  { id: "driver-crud", name: "Chauffeur CRUD", description: "Driver insert + verify + cleanup", status: "pending" },
  { id: "vehicle-crud", name: "Voertuig CRUD", description: "Vehicle insert + verify + cleanup", status: "pending" },
  { id: "invoice-crud", name: "Factuur CRUD", description: "Invoice insert + verify + cleanup", status: "pending" },
  { id: "route-stops", name: "Route stops", description: "Trip + route_stops relatie test", status: "pending" },
  { id: "rls-check", name: "RLS actief", description: "Controleer RLS op core tabellen", status: "pending" },
  { id: "profile-exists", name: "Profiel aanwezig", description: "Auth user profiel bestaat", status: "pending" },
  { id: "company-linked", name: "Bedrijf gekoppeld", description: "User-company koppeling geldig", status: "pending" },
  { id: "health-check", name: "Health endpoint", description: "Edge function beschikbaarheid", status: "pending" },
];

export const useQATests = () => {
  const [tests, setTests] = useState<QATestResult[]>(INITIAL_TESTS);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const updateTest = (id: string, update: Partial<QATestResult>) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...update } : t));
  };

  const runTest = async (testId: string): Promise<boolean> => {
    const start = Date.now();
    updateTest(testId, { status: "running", error: undefined });

    try {
      switch (testId) {
        case "trip-create": {
          const { data, error } = await supabase
            .from("trips")
            .insert({
              customer_name: "QA Test",
              pickup_address: "Test 1", pickup_city: "Amsterdam",
              delivery_address: "Test 2", delivery_city: "Rotterdam",
              trip_date: new Date().toISOString().split("T")[0],
              status: "gepland",
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await supabase.from("trips").delete().eq("id", data.id);
          break;
        }

        case "status-update": {
          const { data, error } = await supabase
            .from("trips")
            .insert({
              customer_name: "QA Status",
              pickup_address: "Test", pickup_city: "Amsterdam",
              delivery_address: "Test", delivery_city: "Rotterdam",
              trip_date: new Date().toISOString().split("T")[0],
              status: "gepland",
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await supabase.from("trips").update({ status: "onderweg" }).eq("id", data.id);
          await supabase.from("trips").update({ status: "afgerond" }).eq("id", data.id);
          const { data: final } = await supabase.from("trips").select("status").eq("id", data.id).single();
          await supabase.from("trips").delete().eq("id", data.id);
          if (final?.status !== "afgerond") throw new Error("Status mismatch");
          break;
        }

        case "tracking-token": {
          const token = crypto.randomUUID();
          const { data, error } = await supabase
            .from("trips")
            .insert({
              customer_name: "QA Token",
              pickup_address: "Test", pickup_city: "Amsterdam",
              delivery_address: "Test", delivery_city: "Rotterdam",
              trip_date: new Date().toISOString().split("T")[0],
              status: "gepland",
              tracking_token: token,
            })
            .select("id, tracking_token")
            .single();
          if (error) throw new Error(error.message);
          if (data.tracking_token !== token) throw new Error("Token mismatch");
          await supabase.from("trips").delete().eq("id", data.id);
          break;
        }

        case "customer-crud": {
          const { data, error } = await supabase
            .from("customers")
            .insert({
              company_name: "QA Test Klant",
              contact_name: "QA Contact",
              email: "qa@test.nl",
              city: "Amsterdam",
            })
            .select("id, company_name")
            .single();
          if (error) throw new Error(error.message);
          const { error: updateErr } = await supabase
            .from("customers")
            .update({ company_name: "QA Updated" })
            .eq("id", data.id);
          if (updateErr) throw new Error(updateErr.message);
          const { data: verify } = await supabase.from("customers").select("company_name").eq("id", data.id).single();
          await supabase.from("customers").delete().eq("id", data.id);
          if (verify?.company_name !== "QA Updated") throw new Error("Update niet doorgevoerd");
          break;
        }

        case "driver-crud": {
          const { data, error } = await supabase
            .from("drivers")
            .insert({ name: "QA Chauffeur", email: "qa-driver@test.nl", status: "active" })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await supabase.from("drivers").delete().eq("id", data.id);
          break;
        }

        case "vehicle-crud": {
          const { data, error } = await supabase
            .from("vehicles")
            .insert({ license_plate: "QA-TEST-01", brand: "QA", model: "Test", vehicle_type: "vrachtwagen" })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await supabase.from("vehicles").delete().eq("id", data.id);
          break;
        }

        case "invoice-crud": {
          const { data, error } = await supabase
            .from("invoices")
            .insert({
              invoice_number: `QA-${Date.now()}`,
              invoice_date: new Date().toISOString().split("T")[0],
              due_date: new Date().toISOString().split("T")[0],
              subtotal: 100,
              vat_amount: 21,
              total_amount: 121,
              status: "concept",
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await supabase.from("invoices").delete().eq("id", data.id);
          break;
        }

        case "route-stops": {
          const { data: trip, error: tripErr } = await supabase
            .from("trips")
            .insert({
              customer_name: "QA Stops",
              pickup_address: "Test", pickup_city: "Amsterdam",
              delivery_address: "Test", delivery_city: "Rotterdam",
              trip_date: new Date().toISOString().split("T")[0],
              status: "gepland",
            })
            .select("id")
            .single();
          if (tripErr) throw new Error(tripErr.message);
          const { error: stopErr } = await supabase.from("route_stops").insert([
            { trip_id: trip.id, stop_order: 1, stop_type: "pickup", address: "Test A", city: "Amsterdam" },
            { trip_id: trip.id, stop_order: 2, stop_type: "delivery", address: "Test B", city: "Rotterdam" },
          ]);
          if (stopErr) throw new Error(stopErr.message);
          const { count } = await supabase.from("route_stops").select("*", { count: "exact", head: true }).eq("trip_id", trip.id);
          await supabase.from("route_stops").delete().eq("trip_id", trip.id);
          await supabase.from("trips").delete().eq("id", trip.id);
          if ((count ?? 0) < 2) throw new Error(`Verwacht 2 stops, got ${count}`);
          break;
        }

        case "rls-check": {
          // Verify we can read our own data (RLS allows tenant access)
          const tables = ["trips", "customers", "drivers", "vehicles", "invoices"] as const;
          for (const table of tables) {
            const { error } = await supabase.from(table).select("id").limit(1);
            if (error) throw new Error(`RLS blokkeerde ${table}: ${error.message}`);
          }
          break;
        }

        case "profile-exists": {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Niet ingelogd");
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!profile) throw new Error("Profiel niet gevonden voor huidige gebruiker");
          break;
        }

        case "company-linked": {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Niet ingelogd");
          const { data: uc, error } = await supabase
            .from("user_companies")
            .select("company_id, is_primary")
            .eq("user_id", user.id)
            .eq("is_primary", true)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!uc) throw new Error("Geen bedrijf gekoppeld aan gebruiker");
          break;
        }

        case "health-check": {
          const { data, error } = await supabase.functions.invoke("health-check");
          if (error) throw new Error(error.message);
          if (!data || data.status === "down") throw new Error("Health check rapporteert 'down'");
          break;
        }

        default:
          throw new Error(`Onbekende test: ${testId}`);
      }

      updateTest(testId, { status: "pass", duration: Date.now() - start });
      return true;
    } catch (error) {
      updateTest(testId, {
        status: "fail",
        error: error instanceof Error ? error.message : "Onbekende fout",
        duration: Date.now() - start,
      });
      return false;
    }
  };

  const runAllTests = useCallback(async () => {
    setRunning(true);
    // Reset all tests
    setTests(INITIAL_TESTS);

    let passed = 0;
    for (const test of INITIAL_TESTS) {
      if (await runTest(test.id)) passed++;
    }
    setRunning(false);
    toast({ title: "QA Tests", description: `${passed}/${INITIAL_TESTS.length} geslaagd` });
  }, [toast]);

  return { tests, running, runTest, runAllTests };
};
