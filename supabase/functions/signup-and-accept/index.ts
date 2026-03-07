import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_id, email, password, full_name, phone } = await req.json();

    if (!invitation_id || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Verify invitation is valid and email matches
    const { data: invitation, error: invError } = await adminClient
      .from("tenant_invitations")
      .select("*, units!inner(id, unit_number, rent_amount, tenant_id, properties!inner(name))")
      .eq("id", invitation_id)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid invitation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.status !== "pending") {
      return new Response(JSON.stringify({ error: "This invitation has already been used" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.tenant_email.toLowerCase() !== email.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Email does not match invitation" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create user or sign in existing user
    let userId: string;
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone, role: "tenant" },
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        // User exists — try to sign them in with the provided password
        const tempClient = createClient(supabaseUrl, anonKey);
        const { data: signIn, error: signErr } = await tempClient.auth.signInWithPassword({ email, password });
        if (signErr) {
          return new Response(JSON.stringify({ error: "An account with this email already exists. Please sign in with your existing password." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = signIn.user.id;
      } else {
        throw createError;
      }
    } else {
      userId = newUser.user.id;
    }

    // 3. Accept invitation: update status, assign unit, ensure role
    await adminClient
      .from("tenant_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation_id);

    await adminClient
      .from("units")
      .update({ tenant_id: userId, status: "occupied" })
      .eq("id", invitation.unit_id);

    // Role is auto-created by handle_new_user trigger, but ensure tenant role exists
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "tenant")
      .maybeSingle();

    if (!existingRole) {
      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: "tenant" }, { onConflict: "user_id,role" });
    }

    // 4. Sign in the user to get a session
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Account created and invitation accepted, but auto-sign-in failed
      return new Response(JSON.stringify({
        success: true,
        needs_login: true,
        unit_number: (invitation.units as any).unit_number,
        property_name: (invitation.units as any).properties?.name,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unit = invitation.units as any;
    return new Response(JSON.stringify({
      success: true,
      session: signInData.session,
      unit_number: unit.unit_number,
      property_name: unit.properties?.name,
      rent_amount: unit.rent_amount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
