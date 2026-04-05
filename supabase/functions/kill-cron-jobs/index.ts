import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "cron" } }
    );

    // Try to list and unschedule all active cron jobs
    // Use raw SQL via rpc since cron schema isn't exposed via REST
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First, try to get active jobs
    const { data: jobs, error: listErr } = await adminClient.rpc("get_active_cron_jobs");
    
    if (listErr) {
      console.log("[kill-cron] RPC not available, trying direct SQL approach");
      
      // Alternative: use pg connection from edge function  
      const dbUrl = Deno.env.get("SUPABASE_DB_URL");
      if (!dbUrl) {
        return new Response(JSON.stringify({ error: "No DB URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use Deno's postgres driver
      const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
      const sql = postgres(dbUrl, { 
        connect_timeout: 30,
        idle_timeout: 5,
        max: 1,
      });

      try {
        // List active jobs
        const activeJobs = await sql`SELECT jobid, jobname, schedule, command FROM cron.job WHERE active = true`;
        console.log(`[kill-cron] Found ${activeJobs.length} active jobs`);

        const results = [];
        for (const job of activeJobs) {
          try {
            await sql`SELECT cron.unschedule(${job.jobid}::bigint)`;
            results.push({ jobid: job.jobid, jobname: job.jobname, status: "unscheduled" });
            console.log(`[kill-cron] Unscheduled: ${job.jobname} (${job.jobid})`);
          } catch (e) {
            // If unschedule fails, try deactivating
            try {
              await sql`UPDATE cron.job SET active = false WHERE jobid = ${job.jobid}`;
              results.push({ jobid: job.jobid, jobname: job.jobname, status: "deactivated" });
              console.log(`[kill-cron] Deactivated: ${job.jobname} (${job.jobid})`);
            } catch (e2) {
              results.push({ jobid: job.jobid, jobname: job.jobname, status: "failed", error: e2.message });
              console.error(`[kill-cron] Failed for ${job.jobname}:`, e2.message);
            }
          }
        }

        await sql.end();
        return new Response(JSON.stringify({ success: true, jobs: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (sqlErr) {
        try { await sql.end(); } catch {}
        console.error("[kill-cron] SQL error:", sqlErr);
        return new Response(JSON.stringify({ error: sqlErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, jobs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[kill-cron] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});