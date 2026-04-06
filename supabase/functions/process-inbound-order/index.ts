import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Shared RFQ extraction logic (from rfq-parser) ──
function extractRFQFields(text: string) {
  const result: Record<string, string | null> = {
    pickup_city: null,
    delivery_city: null,
    pickup_address: null,
    delivery_address: null,
    date: null,
    weight: null,
    reference: null,
    vehicle_type: null,
    goods_description: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
  };

  const routePatterns = [
    /(?:van|from|ophalen|laden)\s*[:.]?\s*([A-Za-zÀ-ÿ\s]+?)(?:\s*[-–→>]\s*|\s+(?:naar|to|leveren|lossen)\s+)([A-Za-zÀ-ÿ\s]+?)(?:\s*$|\s*[,.\n])/im,
    /(?:route|traject)\s*[:.]?\s*([A-Za-zÀ-ÿ\s]+?)[-–→>]+([A-Za-zÀ-ÿ\s]+?)(?:$|[,.\n])/im,
  ];
  for (const pat of routePatterns) {
    const m = text.match(pat);
    if (m) { result.pickup_city = m[1].trim(); result.delivery_city = m[2].trim(); break; }
  }

  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{1,2}\s+(?:jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\w*\s*\d{2,4})/i,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) { result.date = m[1]; break; }
  }

  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|ton|kilo)/i);
  if (weightMatch) result.weight = weightMatch[1].replace(",", ".");

  const refMatch = text.match(/(?:ref|referentie|order|bestelling)\s*[:.#]?\s*([A-Za-z0-9\-_]+)/i);
  if (refMatch) result.reference = refMatch[1];

  const vehicleTypes = ["vrachtwagen", "bakwagen", "bus", "trailer", "trekker", "bestelbus", "koelwagen", "truck", "van"];
  const fullText = text.toLowerCase();
  for (const vt of vehicleTypes) {
    if (fullText.includes(vt)) { result.vehicle_type = vt; break; }
  }

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) result.contact_email = emailMatch[0];

  const phoneMatch = text.match(/(?:\+31|0031|0)\s*[1-9][\s.-]?\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/);
  if (phoneMatch) result.contact_phone = phoneMatch[0].replace(/[\s.-]/g, "");

  const goodsMatch = text.match(/(?:goederen|lading|cargo|goods|product)\s*[:.]?\s*(.+?)(?:\n|$)/i);
  if (goodsMatch) result.goods_description = goodsMatch[1].trim();

  // Address patterns (Dutch format)
  const addressPattern = /([A-Za-zÀ-ÿ\s]+\d+[A-Za-z]?)\s*[,\n]\s*(\d{4}\s?[A-Za-z]{2})\s*([A-Za-zÀ-ÿ\s]+)?/g;
  const addresses: string[] = [];
  let am;
  while ((am = addressPattern.exec(text)) !== null) {
    addresses.push(`${am[1].trim()}, ${am[2].trim()}${am[3] ? ' ' + am[3].trim() : ''}`);
  }
  if (addresses.length >= 1 && !result.pickup_address) result.pickup_address = addresses[0];
  if (addresses.length >= 2 && !result.delivery_address) result.delivery_address = addresses[1];

  const confidence = Object.values(result).filter(v => v !== null).length / Object.keys(result).length;
  return { fields: result, confidence: Math.round(confidence * 100) / 100 };
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const m = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (m) {
      const year = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  } catch { /* ignore */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const { inbound_email_id, company_id } = await req.json();
    if (!inbound_email_id) {
      return new Response(JSON.stringify({ error: "inbound_email_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-inbound-order] Processing email ${inbound_email_id}`);

    // 1. Fetch the email
    const { data: email, error: emailErr } = await sb
      .from("inbound_emails")
      .select("*")
      .eq("id", inbound_email_id)
      .single();

    if (emailErr || !email) {
      console.error("[process-inbound-order] Email not found:", emailErr);
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check
    if (email.processing_status === 'processed' || email.processing_status === 'ignored') {
      console.log("[process-inbound-order] Already processed, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = company_id || email.company_id;
    if (!tenantId) {
      await sb.from("inbound_emails").update({ processing_status: "failed" }).eq("id", inbound_email_id);
      return new Response(JSON.stringify({ error: "No company_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create intake record
    const { data: intake, error: intakeErr } = await sb
      .from("email_order_intake")
      .insert({
        inbound_email_id,
        company_id: tenantId,
        status: "received",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (intakeErr) {
      console.error("[process-inbound-order] Intake insert error:", intakeErr);
      await sb.from("inbound_emails").update({ processing_status: "failed" }).eq("id", inbound_email_id);
      return new Response(JSON.stringify({ error: "Intake creation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailText = [email.subject, email.text_body || email.html_body?.replace(/<[^>]*>/g, " ")].filter(Boolean).join("\n\n");

    // 3. Pattern-based extraction
    const { fields: regexFields, confidence: regexConfidence } = extractRFQFields(emailText);
    console.log(`[process-inbound-order] Regex extraction: confidence=${regexConfidence}`);

    // 4. AI Classification + Enrichment
    let aiResult: any = null;
    let finalConfidence = regexConfidence;
    let finalData: Record<string, any> = { ...regexFields };

    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            tools: [{
              type: "function",
              function: {
                name: "classify_transport_order",
                description: "Classify email and extract transport order data",
                parameters: {
                  type: "object",
                  properties: {
                    is_transport_order: { type: "boolean", description: "Is this a transport/logistics order request?" },
                    confidence: { type: "number", description: "Confidence 0.0-1.0" },
                    pickup_company: { type: "string" },
                    pickup_address: { type: "string" },
                    pickup_city: { type: "string" },
                    pickup_postal_code: { type: "string" },
                    delivery_company: { type: "string" },
                    delivery_address: { type: "string" },
                    delivery_city: { type: "string" },
                    delivery_postal_code: { type: "string" },
                    pickup_date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    weight_kg: { type: "number" },
                    goods_description: { type: "string" },
                    reference: { type: "string" },
                    vehicle_type: { type: "string" },
                    special_instructions: { type: "string" },
                    contact_name: { type: "string" },
                    contact_email: { type: "string" },
                    contact_phone: { type: "string" },
                  },
                  required: ["is_transport_order", "confidence"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "classify_transport_order" } },
            messages: [
              {
                role: "system",
                content: `Je bent een specialist in het herkennen van transportopdrachten uit e-mails. 
Analyseer de e-mail en bepaal of het een transportopdracht is. Extraheer alle relevante velden.
Als het GEEN transportopdracht is, zet is_transport_order op false en confidence op 0.
Zorg dat datums in YYYY-MM-DD formaat zijn. Wees zo nauwkeurig mogelijk.`,
              },
              { role: "user", content: `Analyseer deze e-mail:\n\nOnderwerp: ${email.subject || "(geen)"}\n\n${emailText.substring(0, 8000)}` },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            aiResult = JSON.parse(toolCall.function.arguments);
            console.log(`[process-inbound-order] AI result: is_order=${aiResult.is_transport_order}, confidence=${aiResult.confidence}`);

            if (!aiResult.is_transport_order) {
              await sb.from("email_order_intake").update({
                status: "ignored",
                ai_confidence: aiResult.confidence,
                ai_extracted_data: aiResult,
              }).eq("id", intake.id);
              await sb.from("inbound_emails").update({ processing_status: "ignored" }).eq("id", inbound_email_id);

              return new Response(JSON.stringify({ success: true, status: "ignored", reason: "Not a transport order" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            finalConfidence = aiResult.confidence;
            // Merge AI data over regex data
            if (aiResult.pickup_city) finalData.pickup_city = aiResult.pickup_city;
            if (aiResult.delivery_city) finalData.delivery_city = aiResult.delivery_city;
            if (aiResult.pickup_address) finalData.pickup_address = aiResult.pickup_address;
            if (aiResult.delivery_address) finalData.delivery_address = aiResult.delivery_address;
            if (aiResult.pickup_postal_code) finalData.pickup_postal_code = aiResult.pickup_postal_code;
            if (aiResult.delivery_postal_code) finalData.delivery_postal_code = aiResult.delivery_postal_code;
            if (aiResult.pickup_company) finalData.pickup_company = aiResult.pickup_company;
            if (aiResult.delivery_company) finalData.delivery_company = aiResult.delivery_company;
            if (aiResult.pickup_date) finalData.date = aiResult.pickup_date;
            if (aiResult.weight_kg) finalData.weight = String(aiResult.weight_kg);
            if (aiResult.goods_description) finalData.goods_description = aiResult.goods_description;
            if (aiResult.reference) finalData.reference = aiResult.reference;
            if (aiResult.vehicle_type) finalData.vehicle_type = aiResult.vehicle_type;
            if (aiResult.special_instructions) finalData.special_instructions = aiResult.special_instructions;
            if (aiResult.contact_name) finalData.contact_name = aiResult.contact_name;
            if (aiResult.contact_email) finalData.contact_email = aiResult.contact_email;
            if (aiResult.contact_phone) finalData.contact_phone = aiResult.contact_phone;
          }
        } else {
          console.error(`[process-inbound-order] AI error: ${aiResp.status}`);
        }
      } catch (aiErr) {
        console.error("[process-inbound-order] AI call failed:", aiErr);
      }
    }

    // 5. Confidence routing
    if (finalConfidence < 0.5) {
      await sb.from("email_order_intake").update({
        status: "ignored",
        ai_confidence: finalConfidence,
        ai_extracted_data: finalData,
      }).eq("id", intake.id);
      await sb.from("inbound_emails").update({ processing_status: "processed" }).eq("id", inbound_email_id);

      return new Response(JSON.stringify({ success: true, status: "ignored", confidence: finalConfidence }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderStatus = finalConfidence >= 0.8 ? "aanvraag" : "concept";

    // 6. Create trip — ensure required fields have fallbacks
    const tripDate = finalData.date ? (parseDate(finalData.date) || finalData.date) : new Date().toISOString().split("T")[0];
    const pickupAddr = finalData.pickup_address || finalData.pickup_city || "Ophaaladres onbekend";
    const deliveryAddr = finalData.delivery_address || finalData.delivery_city || "Afleveradres onbekend";

    const { data: trip, error: tripErr } = await sb
      .from("trips")
      .insert({
        company_id: tenantId,
        status: orderStatus,
        pickup_address: pickupAddr,
        pickup_city: finalData.pickup_city || null,
        pickup_postal_code: finalData.pickup_postal_code || null,
        delivery_address: deliveryAddr,
        delivery_city: finalData.delivery_city || null,
        delivery_postal_code: finalData.delivery_postal_code || null,
        trip_date: tripDate,
        cargo_description: finalData.goods_description || null,
        weight_kg: finalData.weight ? parseFloat(finalData.weight) : null,
        customer_reference: finalData.reference || null,
        notes: `Auto-import uit e-mail van ${email.from_name || email.from_email} (${email.subject || 'geen onderwerp'}). AI confidence: ${Math.round(finalConfidence * 100)}%`,
      })
      .select("id, order_number")
      .single();

    if (tripErr) {
      console.error("[process-inbound-order] Trip creation failed:", tripErr);
      await sb.from("email_order_intake").update({
        status: "failed",
        ai_confidence: finalConfidence,
        ai_extracted_data: finalData,
        error_message: tripErr.message,
      }).eq("id", intake.id);
      await sb.from("inbound_emails").update({ processing_status: "failed" }).eq("id", inbound_email_id);

      return new Response(JSON.stringify({ error: "Trip creation failed", details: tripErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tripId = trip.id;
    console.log(`[process-inbound-order] Created trip ${trip.order_number} (${tripId}), status=${orderStatus}`);

    // 7. Update intake record
    await sb.from("email_order_intake").update({
      status: "order_created",
      ai_confidence: finalConfidence,
      ai_extracted_data: finalData,
      created_trip_id: tripId,
    }).eq("id", intake.id);

    // 8. Create notification for planners (using correct schema)
    try {
      await sb.from("notifications").insert({
        tenant_id: tenantId,
        notification_type: "email_order_intake",
        title: `Nieuwe transportopdracht via e-mail`,
        body: `${email.from_name || email.from_email}: ${finalData.pickup_city || '?'} → ${finalData.delivery_city || '?'} (${Math.round(finalConfidence * 100)}% zekerheid)`,
        entity_type: "trip",
        entity_id: tripId,
        is_read: false,
      });
    } catch (notifErr) {
      console.error("[process-inbound-order] Notification insert failed:", notifErr);
      // Non-critical, continue
    }

    // 9. Send confirmation email via send-transactional-email
    let autoReplySent = false;
    if (email.from_email) {
      try {
        const confirmHtml = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1a1a2e;">Transportopdracht ontvangen</h2>
          <p>Beste ${finalData.contact_name || email.from_name || 'klant'},</p>
          <p>Wij hebben uw transportopdracht ontvangen en geregistreerd onder ordernummer <strong>${trip.order_number}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            ${finalData.pickup_city ? `<tr><td style="padding:6px 0;color:#666;">Ophalen</td><td style="padding:6px 0;font-weight:600;">${finalData.pickup_city}</td></tr>` : ''}
            ${finalData.delivery_city ? `<tr><td style="padding:6px 0;color:#666;">Leveren</td><td style="padding:6px 0;font-weight:600;">${finalData.delivery_city}</td></tr>` : ''}
            ${finalData.date ? `<tr><td style="padding:6px 0;color:#666;">Datum</td><td style="padding:6px 0;font-weight:600;">${finalData.date}</td></tr>` : ''}
            ${finalData.goods_description ? `<tr><td style="padding:6px 0;color:#666;">Lading</td><td style="padding:6px 0;font-weight:600;">${finalData.goods_description}</td></tr>` : ''}
          </table>
          <p>Wij nemen zo spoedig mogelijk contact met u op voor de planning.</p>
          <p style="color:#888;font-size:12px;margin-top:24px;">Dit is een automatisch gegenereerd bericht.</p>
        </div>`;

        const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientEmail: email.from_email,
            templateName: "order-confirmation-auto",
            idempotencyKey: `order-confirm-${intake.id}`,
            templateData: {
              name: finalData.contact_name || email.from_name || "klant",
              orderNumber: trip.order_number,
              pickupCity: finalData.pickup_city || "",
              deliveryCity: finalData.delivery_city || "",
              date: finalData.date || "",
              goods: finalData.goods_description || "",
            },
          }),
        });

        // If the template doesn't exist, try direct send via invoice_email_log
        if (!sendResp.ok) {
          console.warn(`[process-inbound-order] send-transactional-email failed (${sendResp.status}), logging to email_send_log`);
          await sb.from("invoice_email_log").insert({
            company_id: tenantId,
            recipient_email: email.from_email,
            recipient_name: finalData.contact_name || email.from_name || null,
            email_subject: `Bevestiging transportopdracht ${trip.order_number}`,
            email_body: confirmHtml,
            delivery_status: "pending",
          });
        }

        autoReplySent = true;
        await sb.from("email_order_intake").update({ auto_reply_sent: true }).eq("id", intake.id);
        console.log(`[process-inbound-order] Auto-reply sent/logged`);
      } catch (mailErr) {
        console.error("[process-inbound-order] Confirmation email failed:", mailErr);
      }
    }

    // 10. Mark email as processed
    await sb.from("inbound_emails").update({ processing_status: "processed" }).eq("id", inbound_email_id);

    return new Response(JSON.stringify({
      success: true,
      status: "order_created",
      trip_id: tripId,
      order_number: trip.order_number,
      confidence: finalConfidence,
      auto_reply_sent: autoReplySent,
      needs_review: orderStatus === "concept",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[process-inbound-order] Error:", err);
    return new Response(JSON.stringify({ error: err.message, success: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
