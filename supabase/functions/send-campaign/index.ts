import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");

    if (!sendgridKey) {
      return new Response(JSON.stringify({ error: "SendGrid API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign with related data
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*, senders(*), email_templates(html_content), lists(id)")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user belongs to same company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.company_id !== campaign.company_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get list members with contact emails
    if (!campaign.list_id) {
      return new Response(JSON.stringify({ error: "Campaign has no list assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: members } = await supabase
      .from("list_members")
      .select("contact_id, contacts(id, email, name, status)")
      .eq("list_id", campaign.list_id);

    const activeContacts = (members || [])
      .filter((m: any) => m.contacts?.status === "active" && m.contacts?.email)
      .map((m: any) => m.contacts);

    if (activeContacts.length === 0) {
      return new Response(JSON.stringify({ error: "No active contacts in list" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check suppressions
    const { data: suppressions } = await supabase
      .from("suppressions")
      .select("email")
      .eq("company_id", campaign.company_id);

    const suppressedEmails = new Set((suppressions || []).map((s: any) => s.email.toLowerCase()));
    const contacts = activeContacts.filter((c: any) => !suppressedEmails.has(c.email.toLowerCase()));

    // Update campaign status to sending
    await supabase.from("campaigns").update({
      status: "sending",
      sent_at: new Date().toISOString(),
      total_recipients: contacts.length,
    }).eq("id", campaign_id);

    // Determine sender
    const fromEmail = campaign.senders?.from_email || "noreply@example.com";
    const fromName = campaign.senders?.from_name || "MailPulse";
    const replyTo = campaign.senders?.reply_to || fromEmail;

    const htmlContent = campaign.email_templates?.html_content || `<p>${campaign.subject || "Email"}</p>`;

    // Send emails in batches
    const batchSize = campaign.batch_size || 50;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      for (const contact of batch) {
        try {
          // Create send record
          const { data: sendRecord } = await supabase.from("sends").insert({
            campaign_id,
            contact_id: contact.id,
            status: "queued",
          }).select("id").single();

          // Personalize HTML
          const personalizedHtml = htmlContent
            .replace(/\{\{name\}\}/g, contact.name || "")
            .replace(/\{\{email\}\}/g, contact.email);

          // Send via SendGrid
          const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: contact.email, name: contact.name || undefined }] }],
              from: { email: fromEmail, name: fromName },
              reply_to: { email: replyTo },
              subject: campaign.subject || "Sem assunto",
              content: [{ type: "text/html", value: personalizedHtml }],
              custom_args: {
                campaign_id,
                send_id: sendRecord?.id || "",
                contact_id: contact.id,
              },
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true },
              },
            }),
          });

          if (sgResponse.ok || sgResponse.status === 202) {
            // Get message ID from response headers
            const messageId = sgResponse.headers.get("X-Message-Id") || null;
            await supabase.from("sends").update({
              status: "sent",
              sent_at: new Date().toISOString(),
              sendgrid_message_id: messageId,
            }).eq("id", sendRecord?.id);
            sent++;
          } else {
            const errorBody = await sgResponse.text();
            await supabase.from("sends").update({
              status: "failed",
              error_message: errorBody.substring(0, 500),
            }).eq("id", sendRecord?.id);
            failed++;
            errors.push(`${contact.email}: ${sgResponse.status}`);
          }

          // Consume response body if not already consumed
          if (sgResponse.bodyUsed === false) {
            await sgResponse.text();
          }
        } catch (err: any) {
          failed++;
          errors.push(`${contact.email}: ${err.message}`);
        }
      }

      // Batch delay
      if (campaign.batch_delay_seconds && i + batchSize < contacts.length) {
        await new Promise((r) => setTimeout(r, (campaign.batch_delay_seconds || 1) * 1000));
      }
    }

    // Update campaign status
    const finalStatus = failed === contacts.length ? "error" : "completed";
    await supabase.from("campaigns").update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    // Log event for delivered
    if (sent > 0) {
      await supabase.from("events").insert(
        contacts.slice(0, sent).map((c: any) => ({
          company_id: campaign.company_id,
          campaign_id,
          contact_id: c.id,
          event_type: "delivered" as const,
        }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: contacts.length,
        sent,
        failed,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
