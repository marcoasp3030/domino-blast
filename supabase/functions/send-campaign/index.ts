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
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    if (!campaign.list_id) {
      return new Response(JSON.stringify({ error: "Campaign has no list assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ALL list members with pagination (no 1000 row limit)
    const allContacts: { id: string; email: string; name: string | null }[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: members } = await supabase
        .from("list_members")
        .select("contact_id, contacts(id, email, name, status)")
        .eq("list_id", campaign.list_id)
        .range(offset, offset + PAGE_SIZE - 1);

      if (!members || members.length === 0) {
        hasMore = false;
        break;
      }

      for (const m of members as any[]) {
        if (m.contacts?.status === "active" && m.contacts?.email) {
          allContacts.push({
            id: m.contacts.id,
            email: m.contacts.email,
            name: m.contacts.name,
          });
        }
      }

      offset += PAGE_SIZE;
      if (members.length < PAGE_SIZE) hasMore = false;
    }

    if (allContacts.length === 0) {
      return new Response(JSON.stringify({ error: "No active contacts in list" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check suppressions (also paginated)
    const suppressedEmails = new Set<string>();
    offset = 0;
    hasMore = true;
    while (hasMore) {
      const { data: suppressions } = await supabase
        .from("suppressions")
        .select("email")
        .eq("company_id", campaign.company_id)
        .range(offset, offset + PAGE_SIZE - 1);

      if (!suppressions || suppressions.length === 0) {
        hasMore = false;
        break;
      }
      for (const s of suppressions) {
        suppressedEmails.add(s.email.toLowerCase());
      }
      offset += PAGE_SIZE;
      if (suppressions.length < PAGE_SIZE) hasMore = false;
    }

    const contacts = allContacts.filter((c) => !suppressedEmails.has(c.email.toLowerCase()));

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ error: "All contacts are suppressed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update campaign status to sending
    await supabase.from("campaigns").update({
      status: "sending",
      sent_at: new Date().toISOString(),
      total_recipients: contacts.length,
    }).eq("id", campaign_id);

    // Prepare batch parameters
    const senderInfo = {
      from_email: campaign.senders?.from_email || "noreply@example.com",
      from_name: campaign.senders?.from_name || "Nutricar",
      reply_to: campaign.senders?.reply_to || campaign.senders?.from_email || "noreply@example.com",
    };
    const htmlContent = campaign.email_templates?.html_content || `<p>${campaign.subject || "Email"}</p>`;

    // Split contacts into batches and invoke send-batch for each
    const BATCH_SIZE = campaign.batch_size || 200;
    const batchDelayMs = (campaign.batch_delay_seconds || 2) * 1000;
    const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
    let batchesQueued = 0;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batchContacts = contacts.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);

      // Fire-and-forget: invoke send-batch
      const batchPayload = {
        campaign_id,
        company_id: campaign.company_id,
        subject: campaign.subject || "Sem assunto",
        html_content: htmlContent,
        sender: senderInfo,
        contacts: batchContacts,
        batch_index: batchIndex,
        total_batches: totalBatches,
        is_last_batch: batchIndex === totalBatches - 1,
      };

      // Use fetch to invoke the sibling function
      fetch(`${supabaseUrl}/functions/v1/send-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(batchPayload),
      }).catch((err) => {
        console.error(`Failed to invoke batch ${batchIndex}:`, err);
      });

      batchesQueued++;

      // Stagger batch invocations to avoid rate limiting
      if (i + BATCH_SIZE < contacts.length) {
        await new Promise((r) => setTimeout(r, batchDelayMs));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_contacts: contacts.length,
        batches_queued: batchesQueued,
        batch_size: BATCH_SIZE,
        message: `Envio iniciado: ${contacts.length} contatos em ${totalBatches} lotes`,
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
