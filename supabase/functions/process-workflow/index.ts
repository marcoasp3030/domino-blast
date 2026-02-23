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
  const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find pending/waiting execution steps that are ready
    const { data: waitingSteps } = await supabase
      .from("workflow_execution_steps")
      .select("*, workflow_executions(id, workflow_id, contact_id, status), workflow_steps:step_id(id, step_type, config, workflow_id)")
      .in("status", ["pending", "waiting"])
      .limit(100);

    if (!waitingSteps || waitingSteps.length === 0) {
      return new Response(JSON.stringify({ message: "No steps to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const execStep of waitingSteps as any[]) {
      const execution = execStep.workflow_executions;
      const step = execStep.workflow_steps;

      if (!execution || !step || execution.status !== "running") continue;

      // Check if waiting step is ready (delay passed)
      if (execStep.status === "waiting" && execStep.scheduled_at) {
        const scheduledTime = new Date(execStep.scheduled_at).getTime();
        if (Date.now() < scheduledTime) continue; // Not ready yet
      }

      try {
        const contactId = execution.contact_id;
        const config = step.config || {};

        switch (step.step_type) {
          case "send_email": {
            if (!sendgridKey) throw new Error("SendGrid API key not configured");

            // Get contact info
            const { data: contact } = await supabase
              .from("contacts")
              .select("email, name, company_id")
              .eq("id", contactId)
              .single();

            if (!contact) throw new Error("Contact not found");

            // Get template
            let htmlContent = `<p>${config.subject || "Email automático"}</p>`;
            if (config.template_id) {
              const { data: template } = await supabase
                .from("email_templates")
                .select("html_content")
                .eq("id", config.template_id)
                .single();
              if (template?.html_content) htmlContent = template.html_content;
            }

            // Get sender
            let senderEmail = "noreply@example.com";
            let senderName = "Automação";
            if (config.sender_id) {
              const { data: sender } = await supabase
                .from("senders")
                .select("from_email, from_name")
                .eq("id", config.sender_id)
                .single();
              if (sender) {
                senderEmail = sender.from_email;
                senderName = sender.from_name;
              }
            }

            // Personalize
            const personalizedHtml = htmlContent
              .replace(/\{\{name\}\}/g, contact.name || "")
              .replace(/\{\{email\}\}/g, contact.email);

            const personalizedSubject = (config.subject || "")
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
                personalizations: [{
                  to: [{ email: contact.email, name: contact.name || undefined }],
                  custom_args: { workflow_step_id: step.id, contact_id: contactId },
                }],
                from: { email: senderEmail, name: senderName },
                subject: personalizedSubject,
                content: [{ type: "text/html", value: personalizedHtml }],
                tracking_settings: {
                  click_tracking: { enable: true },
                  open_tracking: { enable: true },
                },
              }),
            });

            if (!sgResponse.ok && sgResponse.status !== 202) {
              const errBody = await sgResponse.text();
              throw new Error(`SendGrid error: ${errBody.substring(0, 200)}`);
            }

            await supabase.from("workflow_execution_steps").update({
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { sent_to: contact.email },
            }).eq("id", execStep.id);

            break;
          }

          case "delay": {
            const value = config.value || 1;
            const unit = config.unit || "days";
            const delayMs = unit === "hours" ? value * 3600000 : value * 86400000;
            const scheduledAt = new Date(Date.now() + delayMs).toISOString();

            await supabase.from("workflow_execution_steps").update({
              status: "waiting",
              scheduled_at: scheduledAt,
            }).eq("id", execStep.id);

            break;
          }

          case "condition": {
            const condition = config.condition;
            let conditionMet = false;

            if (condition === "has_tag" && config.tag_id) {
              const { count } = await supabase
                .from("contact_tags")
                .select("id", { count: "exact", head: true })
                .eq("contact_id", contactId)
                .eq("tag_id", config.tag_id);
              conditionMet = (count || 0) > 0;
            } else if (condition === "opened_email" || condition === "not_opened") {
              // Check if contact has any open event in this workflow
              const { count } = await supabase
                .from("events")
                .select("id", { count: "exact", head: true })
                .eq("contact_id", contactId)
                .eq("event_type", "open");
              conditionMet = condition === "opened_email" ? (count || 0) > 0 : (count || 0) === 0;
            } else if (condition === "clicked_email") {
              const { count } = await supabase
                .from("events")
                .select("id", { count: "exact", head: true })
                .eq("contact_id", contactId)
                .eq("event_type", "click");
              conditionMet = (count || 0) > 0;
            }

            await supabase.from("workflow_execution_steps").update({
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { condition_met: conditionMet, branch: conditionMet ? "yes" : "no" },
            }).eq("id", execStep.id);

            break;
          }

          case "add_tag": {
            if (config.tag_id) {
              await supabase.from("contact_tags").upsert({
                contact_id: contactId,
                tag_id: config.tag_id,
              }, { onConflict: "contact_id,tag_id", ignoreDuplicates: true });
            }

            await supabase.from("workflow_execution_steps").update({
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { tag_id: config.tag_id },
            }).eq("id", execStep.id);
            break;
          }

          case "remove_tag": {
            if (config.tag_id) {
              await supabase.from("contact_tags")
                .delete()
                .eq("contact_id", contactId)
                .eq("tag_id", config.tag_id);
            }

            await supabase.from("workflow_execution_steps").update({
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { tag_id: config.tag_id },
            }).eq("id", execStep.id);
            break;
          }
        }

        // After completing a step, find the next step(s) and create execution entries
        if (execStep.status === "pending" || (execStep.status === "waiting" && step.step_type !== "delay")) {
          await advanceToNextSteps(supabase, execution, step, execStep);
        } else if (step.step_type === "delay" && execStep.status === "waiting") {
          // Delay just completed (time passed), advance now
          await advanceToNextSteps(supabase, execution, step, execStep);
        }

        processed++;
      } catch (err: any) {
        console.error(`Error processing step ${execStep.id}:`, err.message);
        await supabase.from("workflow_execution_steps").update({
          status: "failed",
          executed_at: new Date().toISOString(),
          result: { error: err.message },
        }).eq("id", execStep.id);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-workflow error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function advanceToNextSteps(supabase: any, execution: any, currentStep: any, execStep: any) {
  // Get edges from current step
  const sourceId = currentStep.id;
  const { data: outEdges } = await supabase
    .from("workflow_edges")
    .select("target_step_id, source_handle")
    .eq("workflow_id", execution.workflow_id)
    .eq("source_step_id", sourceId);

  if (!outEdges || outEdges.length === 0) {
    // No more steps - mark execution as completed
    await supabase.from("workflow_executions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", execution.id);
    return;
  }

  // For condition nodes, filter by the branch result
  let targetEdges = outEdges;
  if (currentStep.step_type === "condition" && execStep.result) {
    const branch = execStep.result.branch || (execStep.result.condition_met ? "yes" : "no");
    targetEdges = outEdges.filter((e: any) => e.source_handle === branch);
  }

  if (targetEdges.length === 0) {
    await supabase.from("workflow_executions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", execution.id);
    return;
  }

  // Create execution steps for next steps
  const nextSteps = targetEdges.map((e: any) => ({
    execution_id: execution.id,
    step_id: e.target_step_id,
    status: "pending",
  }));

  await supabase.from("workflow_execution_steps").insert(nextSteps);

  // Update current step pointer
  await supabase.from("workflow_executions").update({
    current_step_id: targetEdges[0].target_step_id,
  }).eq("id", execution.id);
}
