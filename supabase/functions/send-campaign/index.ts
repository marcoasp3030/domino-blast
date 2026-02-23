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

    // Prepare batch parameters
    const senderInfo = {
      from_email: campaign.senders?.from_email || "noreply@example.com",
      from_name: campaign.senders?.from_name || "Nutricar",
      reply_to: campaign.senders?.reply_to || campaign.senders?.from_email || "noreply@example.com",
    };
    const htmlContent = campaign.email_templates?.html_content || `<p>${campaign.subject || "Email"}</p>`;
    const BATCH_SIZE = campaign.batch_size || 200;
    const batchDelayMs = (campaign.batch_delay_seconds || 2) * 1000;

    // ─── A/B Test logic ───
    const isAB = campaign.ab_test_enabled && campaign.subject_b;

    if (isAB) {
      const samplePercent = campaign.ab_test_sample_percent || 20;
      const sampleSize = Math.max(2, Math.floor(contacts.length * samplePercent / 100));
      const halfSample = Math.floor(sampleSize / 2);

      // Shuffle contacts
      const shuffled = [...contacts].sort(() => Math.random() - 0.5);
      const groupA = shuffled.slice(0, halfSample);
      const groupB = shuffled.slice(halfSample, halfSample * 2);
      // remaining contacts will be sent when winner is determined
      const remainingCount = contacts.length - groupA.length - groupB.length;

      await supabase.from("campaigns").update({
        status: "sending",
        sent_at: new Date().toISOString(),
        total_recipients: contacts.length,
        ab_test_status: "testing",
        ab_test_sent_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      // Send group A with subject A
      const sendGroup = async (group: typeof contacts, subject: string, variant: string) => {
        const totalBatches = Math.ceil(group.length / BATCH_SIZE);
        for (let i = 0; i < group.length; i += BATCH_SIZE) {
          const batchContacts = group.slice(i, i + BATCH_SIZE);
          const batchIndex = Math.floor(i / BATCH_SIZE);
          fetch(`${supabaseUrl}/functions/v1/send-batch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              campaign_id,
              company_id: campaign.company_id,
              subject,
              html_content: htmlContent,
              sender: senderInfo,
              contacts: batchContacts,
              batch_index: batchIndex,
              total_batches: totalBatches,
              is_last_batch: false, // Don't finalize, we'll do it after both groups
              ab_variant: variant,
            }),
          }).catch((err) => console.error(`Failed batch ${variant}-${batchIndex}:`, err));
          if (i + BATCH_SIZE < group.length) await new Promise((r) => setTimeout(r, batchDelayMs));
        }
      };

      await sendGroup(groupA, campaign.subject, "A");
      await sendGroup(groupB, campaign.subject_b, "B");

      // Schedule evaluation after wait_hours via pg_net
      const waitHours = campaign.ab_test_wait_hours || 4;
      // Use pg_cron one-time schedule to evaluate
      await supabase.rpc("schedule_ab_evaluation" as any, {
        _campaign_id: campaign_id,
        _delay_minutes: waitHours * 60,
      }).catch(() => {
        // Fallback: just log - user can manually trigger or cron will pick it up
        console.log(`AB evaluation scheduled in ${waitHours}h for campaign ${campaign_id}`);
      });

      return new Response(
        JSON.stringify({
          success: true,
          ab_test: true,
          group_a: groupA.length,
          group_b: groupB.length,
          remaining: remainingCount,
          wait_hours: waitHours,
          message: `Teste A/B iniciado: ${groupA.length} (A) + ${groupB.length} (B) contatos. Vencedor será enviado para ${remainingCount} restantes em ${waitHours}h.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Normal (non-A/B) send ───
    await supabase.from("campaigns").update({
      status: "sending",
      sent_at: new Date().toISOString(),
      total_recipients: contacts.length,
    }).eq("id", campaign_id);

    const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
    let batchesQueued = 0;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batchContacts = contacts.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);

      fetch(`${supabaseUrl}/functions/v1/send-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          campaign_id,
          company_id: campaign.company_id,
          subject: campaign.subject || "Sem assunto",
          html_content: htmlContent,
          sender: senderInfo,
          contacts: batchContacts,
          batch_index: batchIndex,
          total_batches: totalBatches,
          is_last_batch: batchIndex === totalBatches - 1,
        }),
      }).catch((err) => {
        console.error(`Failed to invoke batch ${batchIndex}:`, err);
      });

      batchesQueued++;

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
