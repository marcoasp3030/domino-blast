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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contact_id");
    const campaignId = url.searchParams.get("campaign_id");

    if (!contactId) {
      return new Response(buildHtmlPage("Erro", "Link de descadastro inválido."), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Fetch contact info
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, email, name, company_id, status")
      .eq("id", contactId)
      .single();

    if (contactError || !contact) {
      return new Response(buildHtmlPage("Erro", "Contato não encontrado."), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Already unsubscribed
    if (contact.status === "unsubscribed") {
      return new Response(
        buildHtmlPage("Já descadastrado", `O email <strong>${contact.email}</strong> já foi removido da nossa lista de envios.`),
        { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Update contact status to unsubscribed
    await supabase
      .from("contacts")
      .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("id", contactId);

    // Add to suppressions
    await supabase.from("suppressions").upsert(
      {
        email: contact.email.toLowerCase(),
        company_id: contact.company_id,
        reason: "unsubscribe",
      },
      { onConflict: "email,company_id", ignoreDuplicates: true }
    );

    // Log event if campaign_id provided
    if (campaignId) {
      await supabase.from("events").insert({
        event_type: "unsubscribe",
        contact_id: contactId,
        campaign_id: campaignId,
        company_id: contact.company_id,
      });
    }

    console.log(`Contact ${contactId} (${contact.email}) unsubscribed`);

    return new Response(
      buildHtmlPage(
        "Descadastrado com sucesso",
        `O email <strong>${contact.email}</strong> foi removido da nossa lista de envios.<br><br>Você não receberá mais nossas comunicações.`
      ),
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    console.error("unsubscribe error:", err);
    return new Response(
      buildHtmlPage("Erro", "Ocorreu um erro ao processar sua solicitação. Tente novamente."),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Nutricar Brasil</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #334155;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 480px;
      width: 100%;
      padding: 48px 36px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: #f0fdf4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .icon.error { background: #fef2f2; }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #64748b;
    }
    p strong { color: #334155; }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${title.includes("Erro") ? "error" : ""}">
      ${title.includes("Erro") ? "⚠️" : "✅"}
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="footer">Nutricar Brasil</p>
  </div>
</body>
</html>`;
}
