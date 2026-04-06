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

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: uc } = await supabase.from("user_companies").select("company_id").eq("user_id", user.id).eq("is_primary", true).limit(1).maybeSingle();
    const tenantId = uc?.company_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, batchId, data: importData, targetTable, mappings } = await req.json();
    console.log(`[migration-api-sync] action=${action} batchId=${batchId} table=${targetTable}`);

    if (action === "validate") {
      // Validate import data against expected schema
      if (!importData || !Array.isArray(importData)) {
        return new Response(JSON.stringify({ success: false, error: "Geen data om te valideren" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const errors: any[] = [];
      const valid: any[] = [];

      importData.forEach((row: any, idx: number) => {
        const rowErrors: string[] = [];
        if (targetTable === "trips" && !row.order_number && !row.ordernummer) {
          rowErrors.push("Ordernummer ontbreekt");
        }
        if (targetTable === "customers" && !row.company_name && !row.bedrijfsnaam && !row.naam) {
          rowErrors.push("Bedrijfsnaam ontbreekt");
        }
        if (targetTable === "drivers" && !row.name && !row.naam) {
          rowErrors.push("Naam ontbreekt");
        }

        if (rowErrors.length > 0) {
          errors.push({ row: idx + 1, errors: rowErrors });
        } else {
          valid.push(row);
        }
      });

      return new Response(JSON.stringify({
        success: true,
        validCount: valid.length,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
        message: `${valid.length} rijen geldig, ${errors.length} met fouten`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "import") {
      if (!importData || !Array.isArray(importData) || !targetTable) {
        return new Response(JSON.stringify({ success: false, error: "data, targetTable vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Apply mappings if provided
      const mappedData = importData.map((row: any) => {
        const mapped: any = { tenant_id: tenantId };
        if (mappings && typeof mappings === "object") {
          for (const [src, tgt] of Object.entries(mappings)) {
            if (row[src] !== undefined && tgt) {
              mapped[tgt as string] = row[src];
            }
          }
        } else {
          Object.assign(mapped, row);
          mapped.tenant_id = tenantId;
        }
        return mapped;
      });

      // Insert in batches of 100
      let inserted = 0;
      let failed = 0;
      const batchSize = 100;

      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);
        const { error: insertErr } = await supabase.from(targetTable).insert(batch);
        if (insertErr) {
          console.error(`[migration-api-sync] Batch ${i} error:`, insertErr.message);
          failed += batch.length;
        } else {
          inserted += batch.length;
        }
      }

      // Log the batch
      if (batchId) {
        await supabase.from("migration_batches").update({
          status: failed === 0 ? "completed" : "partial",
          records_imported: inserted,
          records_failed: failed,
          completed_at: new Date().toISOString(),
        }).eq("id", batchId);
      }

      return new Response(JSON.stringify({
        success: true,
        synced: inserted,
        failed,
        total: mappedData.length,
        message: `${inserted} rijen geïmporteerd, ${failed} mislukt`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Onbekende actie: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[migration-api-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
