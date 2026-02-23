import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This function is called to start a workflow for a specific contact
// It creates the execution and the first step entry
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { workflow_id, contact_id } = await req.json();
    if (!workflow_id || !contact_id) {
      return new Response(JSON.stringify({ error: "workflow_id and contact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check workflow exists and is active
    const { data: workflow } = await supabase
      .from("workflows")
      .select("id, status")
      .eq("id", workflow_id)
      .single();

    if (!workflow || workflow.status !== "active") {
      return new Response(JSON.stringify({ error: "Workflow not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if contact is already running this workflow
    const { count } = await supabase
      .from("workflow_executions")
      .select("id", { count: "exact", head: true })
      .eq("workflow_id", workflow_id)
      .eq("contact_id", contact_id)
      .eq("status", "running");

    if ((count || 0) > 0) {
      return new Response(JSON.stringify({ message: "Contact already in workflow" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the first step (connected to trigger)
    const { data: triggerEdges } = await supabase
      .from("workflow_edges")
      .select("target_step_id")
      .eq("workflow_id", workflow_id)
      .eq("source_step_id", "trigger");

    if (!triggerEdges || triggerEdges.length === 0) {
      return new Response(JSON.stringify({ error: "No steps connected to trigger" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstStepId = triggerEdges[0].target_step_id;

    // Create execution
    const { data: execution, error: execErr } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id,
        contact_id,
        current_step_id: firstStepId,
      })
      .select("id")
      .single();

    if (execErr) throw execErr;

    // Create first execution step
    await supabase.from("workflow_execution_steps").insert({
      execution_id: execution.id,
      step_id: firstStepId,
      status: "pending",
    });

    console.log(`Workflow ${workflow_id} started for contact ${contact_id}, execution ${execution.id}`);

    return new Response(
      JSON.stringify({ success: true, execution_id: execution.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("start-workflow error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
