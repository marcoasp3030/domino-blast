import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode as decodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-email-event-webhook-signature, x-twilio-email-event-webhook-timestamp",
};

const eventTypeMap: Record<string, string> = {
  delivered: "delivered",
  open: "open",
  click: "click",
  bounce: "bounce",
  spamreport: "spam",
  unsubscribe: "unsubscribe",
  dropped: "dropped",
};

async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyData = decodeBase64(base64Key);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

async function verifySignature(
  publicKey: CryptoKey,
  payload: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  const signedContent = timestamp + payload;
  const signatureBytes = decodeBase64(signature);
  const encoder = new TextEncoder();
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signatureBytes,
    encoder.encode(signedContent)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Signature verification (optional — log warning but don't block)
    const verificationKey = Deno.env.get("SENDGRID_WEBHOOK_VERIFICATION_KEY");
    const rawBody = await req.text();

    if (verificationKey) {
      const signature = req.headers.get("x-twilio-email-event-webhook-signature");
      const timestamp = req.headers.get("x-twilio-email-event-webhook-timestamp");

      if (signature && timestamp) {
        try {
          const publicKey = await importPublicKey(verificationKey);
          const isValid = await verifySignature(publicKey, rawBody, signature, timestamp);
          if (!isValid) {
            console.warn("Webhook signature invalid — processing anyway");
          }
        } catch (err) {
          console.warn("Signature verification skipped (key format issue):", err.message);
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const events = JSON.parse(rawBody);

    if (!Array.isArray(events)) {
      return new Response(JSON.stringify({ error: "Expected array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const event of events) {
      const mappedType = eventTypeMap[event.event];
      if (!mappedType) continue;

      const campaignId = event.campaign_id || event.custom_args?.campaign_id || null;
      const contactId = event.contact_id || event.custom_args?.contact_id || null;
      const sendId = event.send_id || event.custom_args?.send_id || null;
      const sgMessageId = event.sg_message_id?.split(".")[0] || null;

      // We need company_id — look it up from campaign or send
      let companyId: string | null = null;

      if (campaignId) {
        const { data } = await supabase
          .from("campaigns")
          .select("company_id")
          .eq("id", campaignId)
          .single();
        companyId = data?.company_id || null;
      }

      if (!companyId && sendId) {
        const { data } = await supabase
          .from("sends")
          .select("campaign_id, campaigns(company_id)")
          .eq("id", sendId)
          .single();
        companyId = (data as any)?.campaigns?.company_id || null;
      }

      if (!companyId && sgMessageId) {
        const { data } = await supabase
          .from("sends")
          .select("campaign_id, campaigns(company_id)")
          .eq("sendgrid_message_id", sgMessageId)
          .single();
        companyId = (data as any)?.campaigns?.company_id || null;
        if (!campaignId && data) {
          // backfill from lookup
        }
      }

      if (!companyId) continue; // Can't insert without company_id

      await supabase.from("events").insert({
        company_id: companyId,
        campaign_id: campaignId,
        contact_id: contactId,
        send_id: sendId,
        sendgrid_message_id: sgMessageId,
        event_type: mappedType as any,
        ip_address: event.ip || null,
        user_agent: event.useragent || null,
        url: event.url || null,
        timestamp: event.timestamp
          ? new Date(event.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      });

      // Update send status for bounces
      if (sendId && (mappedType === "bounce" || mappedType === "dropped")) {
        await supabase
          .from("sends")
          .update({ status: "failed", error_message: mappedType })
          .eq("id", sendId);
      }

      // Update contact status for bounces/unsubscribes
      if (contactId) {
        if (mappedType === "bounce") {
          await supabase.from("contacts").update({ status: "bounced" }).eq("id", contactId);
        } else if (mappedType === "unsubscribe") {
          await supabase.from("contacts").update({ status: "unsubscribed" }).eq("id", contactId);
        }
      }

      // Add to suppressions for spam/unsubscribe
      if (contactId && companyId && (mappedType === "spam" || mappedType === "unsubscribe")) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("email")
          .eq("id", contactId)
          .single();
        if (contact?.email) {
          await supabase.from("suppressions").upsert(
            { company_id: companyId, email: contact.email, reason: mappedType },
            { onConflict: "company_id,email", ignoreDuplicates: true }
          );
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
