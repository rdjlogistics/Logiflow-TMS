import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connectionId, syncType } = await req.json();
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const syncMode = syncType || "incremental";
    console.log(`[ecommerce-sync] connectionId=${connectionId}, syncType=${syncMode}, user=${user.id}`);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify connection exists
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("ecommerce_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Verbinding niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update sync status to syncing
    await supabaseAdmin
      .from("ecommerce_connections")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("id", connectionId);

    const platform = conn.platform;
    const storeName = conn.store_name;
    console.log(`[ecommerce-sync] Platform: ${platform}, store: ${storeName}`);

    // Platform-specific sync
    let syncResult: { orders_synced: number; products_synced: number; errors: string[] } = {
      orders_synced: 0,
      products_synced: 0,
      errors: [],
    };

    try {
      const credentials = conn.credentials_encrypted as Record<string, any> | null;

      if (!credentials?.api_key && !credentials?.access_token) {
        throw new Error(`Geen geldige API credentials gevonden voor ${platform}. Configureer de verbinding opnieuw.`);
      }

      // Platform routing — each platform has its own fetch logic
      switch (platform) {
        case "shopify": {
          const apiKey = credentials.api_key || credentials.access_token;
          const storeUrl = credentials.store_url || `https://${storeName}.myshopify.com`;

          // Fetch recent orders
          const ordersRes = await fetch(`${storeUrl}/admin/api/2024-01/orders.json?status=any&limit=50`, {
            headers: { "X-Shopify-Access-Token": apiKey, "Content-Type": "application/json" },
          });

          if (!ordersRes.ok) {
            const errText = await ordersRes.text();
            throw new Error(`Shopify orders API fout [${ordersRes.status}]: ${errText}`);
          }

          const ordersData = await ordersRes.json();
          syncResult.orders_synced = ordersData.orders?.length || 0;
          break;
        }

        case "woocommerce": {
          const { api_key, api_secret, store_url } = credentials;
          if (!store_url) throw new Error("WooCommerce store_url ontbreekt in credentials");

          const ordersRes = await fetch(
            `${store_url}/wp-json/wc/v3/orders?per_page=50`,
            {
              headers: {
                Authorization: `Basic ${btoa(`${api_key}:${api_secret}`)}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!ordersRes.ok) {
            const errText = await ordersRes.text();
            throw new Error(`WooCommerce API fout [${ordersRes.status}]: ${errText}`);
          }

          const wcOrders = await ordersRes.json();
          syncResult.orders_synced = Array.isArray(wcOrders) ? wcOrders.length : 0;
          break;
        }

        case "bol.com":
        case "amazon":
        case "magento": {
          // These platforms require more complex OAuth/API setup
          // Mark as pending configuration
          syncResult.errors.push(`${platform} synchronisatie vereist aanvullende configuratie. Neem contact op met support.`);
          break;
        }

        default: {
          syncResult.errors.push(`Platform '${platform}' wordt nog niet ondersteund voor automatische sync.`);
        }
      }

      // Update connection with results
      const hasErrors = syncResult.errors.length > 0;
      await supabaseAdmin
        .from("ecommerce_connections")
        .update({
          sync_status: hasErrors && syncResult.orders_synced === 0 ? "error" : "success",
          last_sync_at: new Date().toISOString(),
          sync_error: hasErrors ? syncResult.errors.join("; ") : null,
        })
        .eq("id", connectionId);

    } catch (syncErr: any) {
      console.error(`[ecommerce-sync] Sync error for ${platform}:`, syncErr);

      await supabaseAdmin
        .from("ecommerce_connections")
        .update({
          sync_status: "error",
          sync_error: syncErr.message || "Onbekende synchronisatiefout",
        })
        .eq("id", connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          error: syncErr.message,
          connectionId,
          platform,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisatie voor ${storeName} (${platform}) voltooid.`,
        connectionId,
        platform,
        syncType: syncMode,
        result: syncResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ecommerce-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
