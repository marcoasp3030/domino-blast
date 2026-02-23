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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, force_winner } = await req.json().catch(() => ({}));

    // If no campaign_id, find all campaigns in "testing" status past their wait time
    let campaignIds: string[] = [];

    if (campaign_id) {
      campaignIds = [campaign_id];
    } else {
      const { data: testing } = await supabase
        .from("campaigns")
        .select("id, ab_test_sent_at, ab_test_wait_hours")
        .eq("ab_test_status", "testing");

      if (testing) {
        const now = Date.now();
        for (const c of testing) {
          const sentAt = new Date(c.ab_test_sent_at).getTime();
          const waitMs = (c.ab_test_wait_hours || 4) * 3600 * 1000;
          if (now - sentAt >= waitMs) {
            campaignIds.push(c.id);
          }
        }
      }
    }

    if (campaignIds.length === 0) {
      return new Response(JSON.stringify({ message: "No campaigns to evaluate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const cid of campaignIds) {
      try {
        const result = await evaluateCampaign(supabase, supabaseUrl, supabaseServiceKey, cid, force_winner);
        results.push({ campaign_id: cid, ...result });
      } catch (err: any) {
        results.push({ campaign_id: cid, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("evaluate-ab-test error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function evaluateCampaign(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  campaignId: string,
  forceWinner?: string
) {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, senders(*), email_templates(html_content), lists(id)")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.ab_test_status === "winner_sent") {
    return { message: "Winner already sent" };
  }

  // Count opens and clicks for each variant
  // Variant info is stored in sends table - we need to check which subject was used
  // We'll use the events table to count opens/clicks per contact, then cross-reference
  // with sends to determine variant

  // Get all sends for this campaign
  const { data: sends } = await supabase
    .from("sends")
    .select("id, contact_id, ab_variant")
    .eq("campaign_id", campaignId);

  if (!sends || sends.length === 0) throw new Error("No sends found");

  const sendIds = sends.map((s: any) => s.id);

  // Get events for these sends
  const { data: events } = await supabase
    .from("events")
    .select("contact_id, event_type")
    .eq("campaign_id", campaignId)
    .in("event_type", ["open", "click"]);

  // Use stored ab_variant to determine groups
  const groupAContactIds = new Set(sends.filter((s: any) => s.ab_variant === "A").map((s: any) => s.contact_id));
  const groupBContactIds = new Set(sends.filter((s: any) => s.ab_variant === "B").map((s: any) => s.contact_id));

  // Fallback for legacy sends without ab_variant: split by order
  if (groupAContactIds.size === 0 && groupBContactIds.size === 0) {
    const halfIndex = Math.floor(sends.length / 2);
    sends.slice(0, halfIndex).forEach((s: any) => groupAContactIds.add(s.contact_id));
    sends.slice(halfIndex).forEach((s: any) => groupBContactIds.add(s.contact_id));
  }

  let aOpens = 0, aClicks = 0, bOpens = 0, bClicks = 0;
  if (events) {
    for (const e of events) {
      if (groupAContactIds.has(e.contact_id)) {
        if (e.event_type === "open") aOpens++;
        if (e.event_type === "click") aClicks++;
      } else if (groupBContactIds.has(e.contact_id)) {
        if (e.event_type === "open") bOpens++;
        if (e.event_type === "click") bClicks++;
      }
    }
  }

  // Determine winner: clicks > opens > default A
  let winner: string;
  if (forceWinner === "A" || forceWinner === "B") {
    winner = forceWinner;
  } else {
    const aScore = aClicks * 3 + aOpens;
    const bScore = bClicks * 3 + bOpens;
    winner = bScore > aScore ? "B" : "A";
  }

  const winnerSubject = winner === "A" ? campaign.subject : campaign.subject_b;

  console.log(`Campaign ${campaignId} A/B result: A(opens=${aOpens}, clicks=${aClicks}) B(opens=${bOpens}, clicks=${bClicks}) => Winner: ${winner}`);

  // Update campaign with winner
  await supabase.from("campaigns").update({
    ab_test_winner: winner,
    ab_test_status: "winner_selected",
  }).eq("id", campaignId);

  // Now send winning subject to remaining contacts
  if (!campaign.list_id) throw new Error("No list assigned");

  // Get all list members
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

    if (!members || members.length === 0) { hasMore = false; break; }
    for (const m of members as any[]) {
      if (m.contacts?.status === "active" && m.contacts?.email) {
        allContacts.push({ id: m.contacts.id, email: m.contacts.email, name: m.contacts.name });
      }
    }
    offset += PAGE_SIZE;
    if (members.length < PAGE_SIZE) hasMore = false;
  }

  // Filter out contacts already sent (A/B test group)
  const alreadySentIds = new Set(sends.map((s: any) => s.contact_id));
  const remainingContacts = allContacts.filter((c) => !alreadySentIds.has(c.id));

  // Also filter suppressions
  const suppressedEmails = new Set<string>();
  offset = 0;
  hasMore = true;
  while (hasMore) {
    const { data: suppressions } = await supabase
      .from("suppressions")
      .select("email")
      .eq("company_id", campaign.company_id)
      .range(offset, offset + PAGE_SIZE - 1);
    if (!suppressions || suppressions.length === 0) { hasMore = false; break; }
    for (const s of suppressions) suppressedEmails.add(s.email.toLowerCase());
    offset += PAGE_SIZE;
    if (suppressions.length < PAGE_SIZE) hasMore = false;
  }

  const contacts = remainingContacts.filter((c) => !suppressedEmails.has(c.email.toLowerCase()));

  if (contacts.length === 0) {
    await supabase.from("campaigns").update({
      ab_test_status: "winner_sent",
      ab_test_winner_sent_at: new Date().toISOString(),
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", campaignId);
    return { winner, remaining_sent: 0, message: "No remaining contacts to send" };
  }

  const senderInfo = {
    from_email: campaign.senders?.from_email || "noreply@example.com",
    from_name: campaign.senders?.from_name || "Nutricar",
    reply_to: campaign.senders?.reply_to || campaign.senders?.from_email || "noreply@example.com",
  };
  const htmlContent = campaign.email_templates?.html_content || `<p>${winnerSubject}</p>`;
  const BATCH_SIZE = campaign.batch_size || 200;
  const batchDelayMs = (campaign.batch_delay_seconds || 2) * 1000;
  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);

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
        campaign_id: campaignId,
        company_id: campaign.company_id,
        subject: winnerSubject,
        html_content: htmlContent,
        sender: senderInfo,
        contacts: batchContacts,
        batch_index: batchIndex,
        total_batches: totalBatches,
        is_last_batch: batchIndex === totalBatches - 1,
        ab_variant: "winner",
      }),
    }).catch((err) => console.error(`Failed winner batch ${batchIndex}:`, err));

    if (i + BATCH_SIZE < contacts.length) {
      await new Promise((r) => setTimeout(r, batchDelayMs));
    }
  }

  await supabase.from("campaigns").update({
    ab_test_status: "winner_sent",
    ab_test_winner_sent_at: new Date().toISOString(),
  }).eq("id", campaignId);

  return {
    winner,
    winner_subject: winnerSubject,
    stats: { a: { opens: aOpens, clicks: aClicks }, b: { opens: bOpens, clicks: bClicks } },
    remaining_sent: contacts.length,
    message: `Variação ${winner} venceu! Enviando para ${contacts.length} contatos restantes.`,
  };
}
