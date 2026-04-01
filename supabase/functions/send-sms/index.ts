import { corsHeaders } from "@supabase/supabase-js/cors";

interface SmsRequest {
  to: string;
  message: string;
  trip_id?: string;
  driver_id?: string;
  type?: "trip_update" | "dispatch" | "reminder" | "custom";
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SmsRequest = await req.json();

    if (!body.to || !body.message) {
      return new Response(
        JSON.stringify({ success: false, error: "Velden 'to' en 'message' zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = body.to.replace(/\s/g, "");
    if (!isValidE164(phone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Ongeldig telefoonnummer. Gebruik E.164 formaat (bijv. +31612345678)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("MESSAGEBIRD_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS niet geconfigureerd — voeg een MessageBird API key toe in de instellingen",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://rest.messagebird.com/messages", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originator: "LogiFlow",
        recipients: [phone],
        body: body.message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result?.errors?.[0]?.description || "MessageBird fout";
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.id,
        status: result.recipients?.items?.[0]?.status || "sent",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
