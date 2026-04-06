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

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    const tenantId = profile?.company_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch unmatched bank transactions
    const { data: transactions } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", tenantId)
      .eq("is_matched", false)
      .order("transaction_date", { ascending: false })
      .limit(500);

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ success: true, matched: 0, unmatched: 0, message: "Geen onverwerkte transacties" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch unpaid invoices to match against
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, customer_id, due_date, status")
      .eq("company_id", tenantId)
      .in("status", ["verstuurd", "open", "herinnering"]);

    let matchedCount = 0;
    let unmatchedCount = 0;
    const matches: any[] = [];

    for (const tx of transactions) {
      let bestMatch: any = null;
      let bestConfidence = 0;

      for (const inv of (invoices || [])) {
        let confidence = 0;

        // Amount match (exact = 50pts, close = 20pts)
        const amountDiff = Math.abs(tx.amount - (inv.total_amount || 0));
        if (amountDiff < 0.01) {
          confidence += 50;
        } else if (amountDiff < 1) {
          confidence += 30;
        } else if (amountDiff / (inv.total_amount || 1) < 0.05) {
          confidence += 20;
        }

        // Reference match (invoice number in description or reference)
        const searchText = `${tx.description || ""} ${tx.reference || ""}`.toLowerCase();
        const invNum = (inv.invoice_number || "").toLowerCase();
        if (invNum && searchText.includes(invNum)) {
          confidence += 40;
        }

        // Counterparty name match
        if (tx.counterparty_name && inv.customer_id) {
          // Simple check - could be enhanced with customer name lookup
          confidence += 5;
        }

        if (confidence > bestConfidence && confidence >= 50) {
          bestConfidence = confidence;
          bestMatch = inv;
        }
      }

      if (bestMatch && bestConfidence >= 50) {
        // Update bank transaction
        await supabase.from("bank_transactions").update({
          is_matched: true,
          matched_invoice_id: bestMatch.id,
          match_confidence: bestConfidence,
          needs_review: bestConfidence < 80,
          status: "matched",
        }).eq("id", tx.id);

        // If high confidence, mark invoice as paid
        if (bestConfidence >= 90) {
          await supabase.from("invoices").update({ status: "betaald", paid_at: tx.transaction_date }).eq("id", bestMatch.id);
        }

        matches.push({
          transactionId: tx.id,
          invoiceId: bestMatch.id,
          invoiceNumber: bestMatch.invoice_number,
          confidence: bestConfidence,
          amount: tx.amount,
        });
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      matched: matchedCount,
      unmatched: unmatchedCount,
      total: transactions.length,
      matches,
      message: `${matchedCount} transacties gematcht, ${unmatchedCount} onverwerkt`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[bank-reconcile] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
