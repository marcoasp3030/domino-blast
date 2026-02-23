import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Check admin role
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Only admins can invite users" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get caller's company
  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("company_id")
    .eq("user_id", caller.id)
    .single();

  if (!callerProfile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, full_name, role, permissions } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with admin API (auto-confirms)
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split("@")[0],
        company_name: "invited", // flag to skip company creation trigger
      },
    });

    if (createErr) throw createErr;

    const userId = newUser.user.id;

    // Create profile linked to admin's company (the trigger creates a new company, so we fix it)
    // First delete the auto-created profile/company
    const { data: autoProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (autoProfile) {
      // Update profile to point to admin's company
      await adminClient
        .from("profiles")
        .update({ company_id: callerProfile.company_id, full_name: full_name || email.split("@")[0] })
        .eq("user_id", userId);

      // Delete auto-created company if different
      if (autoProfile.company_id !== callerProfile.company_id) {
        await adminClient.from("companies").delete().eq("id", autoProfile.company_id);
      }
    }

    // Set role (delete default, insert new)
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("user_roles").insert({ user_id: userId, role });

    // Set permissions
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permRows = permissions.map((p: string) => ({
        user_id: userId,
        company_id: callerProfile.company_id,
        permission: p,
      }));
      await adminClient.from("user_permissions").insert(permRows);
    }

    // Send password reset so user can set their own password
    // (skip for now, admin shares temp password or we use magic link)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        temp_password: tempPassword,
        message: "User created. Share the temporary password with them.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to invite user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
