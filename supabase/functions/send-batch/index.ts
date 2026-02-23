import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Contact {
  id: string;
  email: string;
  name: string | null;
}

interface BatchPayload {
  campaign_id: string;
  company_id: string;
  subject: string;
  html_content: string;
  sender: {
    from_email: string;
    from_name: string;
    reply_to: string;
  };
  contacts: Contact[];
  batch_index: number;
  total_batches: number;
  is_last_batch: boolean;
  ab_variant?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sendgridKey = Deno.env.get("SENDGRID_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: BatchPayload = await req.json();
    const { campaign_id, company_id, subject, html_content, sender, contacts, batch_index, total_batches, is_last_batch, ab_variant } = payload;

    console.log(`[Batch ${batch_index + 1}/${total_batches}] Processing ${contacts.length} contacts for campaign ${campaign_id}`);

    // Build unsubscribe URL base
    const unsubscribeBase = `${supabaseUrl}/functions/v1/unsubscribe`;

    let sent = 0;
    let failed = 0;

    // Create all send records in bulk first
    const sendRecords = contacts.map((c) => ({
      campaign_id,
      contact_id: c.id,
      status: "queued" as const,
      ...(ab_variant ? { ab_variant } : {}),
    }));

    // Insert in chunks of 500 to avoid payload limits
    const CHUNK_SIZE = 500;
    const allSendIds: Record<string, string> = {}; // contact_id -> send_id

    for (let i = 0; i < sendRecords.length; i += CHUNK_SIZE) {
      const chunk = sendRecords.slice(i, i + CHUNK_SIZE);
      const { data: inserted } = await supabase
        .from("sends")
        .insert(chunk)
        .select("id, contact_id");

      if (inserted) {
        for (const rec of inserted) {
          allSendIds[rec.contact_id] = rec.id;
        }
      }
    }

    // Send emails - use SendGrid batch (personalizations) for efficiency
    // SendGrid allows up to 1000 personalizations per request
    const SG_BATCH = 1000;

    for (let i = 0; i < contacts.length; i += SG_BATCH) {
      const sgBatch = contacts.slice(i, i + SG_BATCH);

      const personalizations = sgBatch.map((contact) => {
        const personalizedSubject = subject
          .replace(/\{\{name\}\}/g, contact.name || "")
          .replace(/\{\{email\}\}/g, contact.email);

        return {
          to: [{ email: contact.email, name: contact.name || undefined }],
          subject: personalizedSubject,
          custom_args: {
            campaign_id,
            send_id: allSendIds[contact.id] || "",
            contact_id: contact.id,
          },
        };
      });

      // Check if body needs per-contact personalization (name, email, or unsubscribe URL)
      const hasBodyPersonalization = html_content.includes("{{name}}") || html_content.includes("{{email}}") || html_content.includes("{{unsubscribe_url}}");

      if (hasBodyPersonalization) {
        // Send individually when body has personalization tags
        for (const contact of sgBatch) {
          try {
            const unsubscribeUrl = `${unsubscribeBase}?contact_id=${contact.id}&campaign_id=${campaign_id}`;
            const personalizedHtml = html_content
              .replace(/\{\{name\}\}/g, contact.name || "")
              .replace(/\{\{email\}\}/g, contact.email)
              .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

            const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sendgridKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                personalizations: [{
                  to: [{ email: contact.email, name: contact.name || undefined }],
                  custom_args: {
                    campaign_id,
                    send_id: allSendIds[contact.id] || "",
                    contact_id: contact.id,
                  },
                }],
                from: { email: sender.from_email, name: sender.from_name },
                reply_to: { email: sender.reply_to },
                subject,
                content: [{ type: "text/html", value: personalizedHtml }],
                tracking_settings: {
                  click_tracking: { enable: true },
                  open_tracking: { enable: true },
                },
              }),
            });

            if (sgResponse.ok || sgResponse.status === 202) {
              const messageId = sgResponse.headers.get("X-Message-Id") || null;
              if (allSendIds[contact.id]) {
                await supabase.from("sends").update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  sendgrid_message_id: messageId,
                }).eq("id", allSendIds[contact.id]);
              }
              sent++;
            } else {
              const errorBody = await sgResponse.text();
              if (allSendIds[contact.id]) {
                await supabase.from("sends").update({
                  status: "failed",
                  error_message: errorBody.substring(0, 500),
                }).eq("id", allSendIds[contact.id]);
              }
              failed++;
            }

            if (!sgResponse.bodyUsed) await sgResponse.text();
          } catch (err: any) {
            failed++;
            console.error(`Failed to send to ${contact.email}:`, err.message);
            if (allSendIds[contact.id]) {
              await supabase.from("sends").update({
                status: "failed",
                error_message: err.message?.substring(0, 500),
              }).eq("id", allSendIds[contact.id]);
            }
          }
        }
      } else {
        // No body personalization: use single API call with multiple personalizations
        try {
          const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations,
              from: { email: sender.from_email, name: sender.from_name },
              reply_to: { email: sender.reply_to },
              subject,
              content: [{ type: "text/html", value: html_content }],
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true },
              },
            }),
          });

          if (sgResponse.ok || sgResponse.status === 202) {
            // Mark all as sent in bulk
            const sentIds = sgBatch
              .map((c) => allSendIds[c.id])
              .filter(Boolean);

            for (let j = 0; j < sentIds.length; j += CHUNK_SIZE) {
              const chunk = sentIds.slice(j, j + CHUNK_SIZE);
              await supabase.from("sends").update({
                status: "sent",
                sent_at: new Date().toISOString(),
              }).in("id", chunk);
            }
            sent += sgBatch.length;
          } else {
            const errorBody = await sgResponse.text();
            console.error(`SendGrid batch error: ${sgResponse.status}`, errorBody);
            // Mark all as failed
            const failedIds = sgBatch
              .map((c) => allSendIds[c.id])
              .filter(Boolean);

            for (let j = 0; j < failedIds.length; j += CHUNK_SIZE) {
              const chunk = failedIds.slice(j, j + CHUNK_SIZE);
              await supabase.from("sends").update({
                status: "failed",
                error_message: errorBody.substring(0, 500),
              }).in("id", chunk);
            }
            failed += sgBatch.length;
          }

          if (!sgResponse.bodyUsed) await sgResponse.text();
        } catch (err: any) {
          failed += sgBatch.length;
          console.error("SendGrid batch call failed:", err.message);
        }
      }
    }

    console.log(`[Batch ${batch_index + 1}/${total_batches}] Done: ${sent} sent, ${failed} failed`);

    // If this is the last batch, finalize campaign status
    if (is_last_batch) {
      // Wait a moment for other batches to potentially finish
      await new Promise((r) => setTimeout(r, 3000));

      // Check overall send stats
      const { count: totalSent } = await supabase
        .from("sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "sent");

      const { count: totalFailed } = await supabase
        .from("sends")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "failed");

      const finalStatus = (totalSent || 0) === 0 ? "error" : "completed";

      await supabase.from("campaigns").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      console.log(`Campaign ${campaign_id} finalized: ${finalStatus} (${totalSent} sent, ${totalFailed} failed)`);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, batch_index }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-batch error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
