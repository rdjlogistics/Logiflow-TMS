import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("[process-email-queue] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Read batch from pgmq queue
    const { data: messages, error: readErr } = await supabaseAdmin.rpc("read_email_batch", {
      queue_name: "email_queue",
      batch_size: 10,
      vt: 30, // visibility timeout 30s
    });

    if (readErr) {
      console.error("[process-email-queue] Queue read error:", readErr.message);
      return new Response(JSON.stringify({ error: readErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "Geen emails in wachtrij" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[process-email-queue] Processing ${messages.length} emails`);

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const email = msg.message;
      try {
        // Sanitize from address
        let fromAddress = email.from || "noreply@notify.rdjlogistics.nl";
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(fromAddress.replace(/^.*</, "").replace(/>.*$/, ""))) {
          fromAddress = "noreply@notify.rdjlogistics.nl";
        }

        const resendPayload: any = {
          from: fromAddress,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject || "(geen onderwerp)",
        };

        if (email.html) resendPayload.html = email.html;
        if (email.text) resendPayload.text = email.text;
        if (email.reply_to) resendPayload.reply_to = email.reply_to;
        if (email.cc) resendPayload.cc = Array.isArray(email.cc) ? email.cc : [email.cc];
        if (email.bcc) resendPayload.bcc = Array.isArray(email.bcc) ? email.bcc : [email.bcc];

        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(resendPayload),
        });

        if (resendResp.ok) {
          const resendData = await resendResp.json();
          console.log(`[process-email-queue] Sent email to ${email.to}, resendId=${resendData.id}`);

          // Log success
          await supabaseAdmin.from("email_send_log").insert({
            tenant_id: email.tenant_id,
            to_address: Array.isArray(email.to) ? email.to[0] : email.to,
            subject: email.subject,
            status: "sent",
            provider: "resend",
            provider_message_id: resendData.id,
            template_name: email.template_name || null,
          }).then(() => {});

          // Delete from queue
          await supabaseAdmin.rpc("delete_email", { queue_name: "email_queue", message_id: msg.msg_id });
          sent++;
        } else {
          const errBody = await resendResp.text();
          console.error(`[process-email-queue] Resend error for ${email.to}: ${resendResp.status} ${errBody}`);

          // Move to DLQ after 3 retries
          if (msg.read_ct >= 3) {
            await supabaseAdmin.rpc("move_to_dlq", {
              source_queue: "email_queue",
              dlq_queue: "email_queue_dlq",
              message_id: msg.msg_id,
              message: email,
            });
            console.warn(`[process-email-queue] Moved to DLQ after ${msg.read_ct} retries: ${email.to}`);
          }
          failed++;
        }
      } catch (emailErr) {
        console.error(`[process-email-queue] Error processing email:`, emailErr);
        failed++;
      }
    }

    console.log(`[process-email-queue] Done: sent=${sent}, failed=${failed}`);

    return new Response(JSON.stringify({
      success: true,
      processed: messages.length,
      sent,
      failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[process-email-queue] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
