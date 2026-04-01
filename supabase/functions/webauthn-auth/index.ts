import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signChallenge(challenge: string, secret: string): string {
  // Simple HMAC-like signature using the challenge + secret
  const combined = challenge + ":" + secret;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash) + byte;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const signingSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log(`[webauthn-auth] Action: ${action}`);

    switch (action) {
      case "register-challenge": {
        // Requires authenticated user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const challenge = generateChallenge();
        const signed = signChallenge(challenge, signingSecret);

        return new Response(JSON.stringify({
          challenge,
          signed,
          userId: userData.user.id,
          user: {
            name: userData.user.email || userData.user.phone || "Chauffeur",
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "register-verify": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { credentialId, publicKey, deviceName } = body;
        if (!credentialId || !publicKey) {
          return new Response(JSON.stringify({ error: "credentialId en publicKey verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Store credential in database
        const { error: insertErr } = await supabaseAdmin
          .from("webauthn_credentials")
          .upsert({
            user_id: userData.user.id,
            credential_id: credentialId,
            public_key: publicKey,
            device_name: deviceName || "Onbekend apparaat",
            sign_count: 0,
            created_at: new Date().toISOString(),
          }, { onConflict: "credential_id" });

        if (insertErr) {
          console.error("[webauthn-auth] Insert error:", insertErr);
          return new Response(JSON.stringify({ error: "Opslaan mislukt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get-auth-challenge": {
        const { credentialId } = body;
        if (!credentialId) {
          return new Response(JSON.stringify({ error: "credentialId verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Verify credential exists
        const { data: cred } = await supabaseAdmin
          .from("webauthn_credentials")
          .select("user_id")
          .eq("credential_id", credentialId)
          .single();

        if (!cred) {
          return new Response(JSON.stringify({ error: "Credential niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const challenge = generateChallenge();

        // Store challenge temporarily (use credential record)
        await supabaseAdmin
          .from("webauthn_credentials")
          .update({ last_challenge: challenge, challenge_expires_at: new Date(Date.now() + 120000).toISOString() })
          .eq("credential_id", credentialId);

        return new Response(JSON.stringify({ challenge }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "authenticate": {
        const { credentialId, authenticatorData, clientDataJSON, signature } = body;
        if (!credentialId || !authenticatorData || !clientDataJSON || !signature) {
          return new Response(JSON.stringify({ error: "Alle authenticatie velden zijn verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Get credential from DB
        const { data: cred } = await supabaseAdmin
          .from("webauthn_credentials")
          .select("user_id, public_key, sign_count, last_challenge, challenge_expires_at")
          .eq("credential_id", credentialId)
          .single();

        if (!cred) {
          return new Response(JSON.stringify({ error: "Credential niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Verify challenge hasn't expired
        if (cred.challenge_expires_at && new Date(cred.challenge_expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "Challenge verlopen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Update sign count
        await supabaseAdmin
          .from("webauthn_credentials")
          .update({
            sign_count: (cred.sign_count || 0) + 1,
            last_used_at: new Date().toISOString(),
            last_challenge: null,
            challenge_expires_at: null,
          })
          .eq("credential_id", credentialId);

        // Get user email for magic link
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(cred.user_id);
        if (!userData?.user?.email) {
          return new Response(JSON.stringify({ error: "Gebruiker niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Generate a magic link OTP for the user
        const { data: otpData, error: otpErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email,
        });

        if (otpErr || !otpData) {
          console.error("[webauthn-auth] OTP generation error:", otpErr);
          return new Response(JSON.stringify({ error: "Sessie aanmaken mislukt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Extract OTP token from the link
        const linkUrl = new URL(otpData.properties?.hashed_token ? `https://placeholder.com?token=${otpData.properties.hashed_token}` : otpData.properties?.action_link || "");
        const token = linkUrl.searchParams.get("token") || otpData.properties?.hashed_token || "";

        return new Response(JSON.stringify({
          success: true,
          email: userData.user.email,
          token,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Onbekende actie: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("[webauthn-auth] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
