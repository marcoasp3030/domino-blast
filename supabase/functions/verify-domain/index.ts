import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// DNS-over-HTTPS using Google Public DNS
async function queryDns(domain: string, type: string): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.Answer) return [];
    return json.Answer.map((a: any) => a.data?.replace(/"/g, "") || "");
  } catch {
    return [];
  }
}

async function checkSpf(domain: string): Promise<string> {
  const records = await queryDns(domain, "TXT");
  const hasSpf = records.some((r) => r.toLowerCase().includes("v=spf1") && r.toLowerCase().includes("sendgrid"));
  return hasSpf ? "validated" : "pending";
}

async function checkDkim(domain: string): Promise<string> {
  // Check s1._domainkey
  const s1 = await queryDns(`s1._domainkey.${domain}`, "CNAME");
  const s2 = await queryDns(`s2._domainkey.${domain}`, "CNAME");
  const hasS1 = s1.some((r) => r.toLowerCase().includes("domainkey") && r.toLowerCase().includes("sendgrid"));
  const hasS2 = s2.some((r) => r.toLowerCase().includes("domainkey") && r.toLowerCase().includes("sendgrid"));
  if (hasS1 && hasS2) return "validated";
  if (hasS1 || hasS2) return "validating";
  return "pending";
}

async function checkDmarc(domain: string): Promise<string> {
  const records = await queryDns(`_dmarc.${domain}`, "TXT");
  const hasDmarc = records.some((r) => r.toLowerCase().includes("v=dmarc1"));
  return hasDmarc ? "validated" : "pending";
}

async function verifyAndUpdate(supabase: any, domainRow: { id: string; domain: string }) {
  console.log(`Verifying DNS for ${domainRow.domain}...`);
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domainRow.domain),
    checkDkim(domainRow.domain),
    checkDmarc(domainRow.domain),
  ]);
  const allValidated = spf === "validated" && dkim === "validated" && dmarc === "validated";
  const anyError = [spf, dkim, dmarc].includes("error");
  const overall = allValidated ? "validated" : anyError ? "error" : "validating";

  await supabase
    .from("domains")
    .update({ spf_status: spf, dkim_status: dkim, dmarc_status: dmarc, overall_status: overall })
    .eq("id", domainRow.id);

  const result = { domain: domainRow.domain, spf_status: spf, dkim_status: dkim, dmarc_status: dmarc, overall_status: overall };
  console.log(`Result:`, result);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body = batch mode */ }

    // Single domain mode
    if (body.domain_id) {
      const { data: domainRow } = await supabase
        .from("domains")
        .select("id, domain")
        .eq("id", body.domain_id)
        .single();

      if (!domainRow) {
        return new Response(JSON.stringify({ error: "Domain not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await verifyAndUpdate(supabase, domainRow);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode: verify all non-validated domains
    const { data: pendingDomains } = await supabase
      .from("domains")
      .select("id, domain")
      .neq("overall_status", "validated");

    if (!pendingDomains || pendingDomains.length === 0) {
      console.log("No pending domains to verify");
      return new Response(JSON.stringify({ message: "No pending domains", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Batch verifying ${pendingDomains.length} domain(s)...`);
    const results = [];
    for (const d of pendingDomains) {
      results.push(await verifyAndUpdate(supabase, d));
    }

    return new Response(JSON.stringify({ count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("verify-domain error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
