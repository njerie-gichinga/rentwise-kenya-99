import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_id } = await req.json();

    if (!invitation_id) {
      return new Response(JSON.stringify({ error: "Missing invitation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invitation
    const { data: invitation, error: invError } = await adminClient
      .from("tenant_invitations")
      .select("*, units!inner(id, unit_number, rent_amount, properties!inner(name))")
      .eq("id", invitation_id)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
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

    // Verify email matches
    if (invitation.tenant_email.toLowerCase() !== (userEmail as string).toLowerCase()) {
      return new Response(JSON.stringify({ error: "This invitation was sent to a different email address" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Update invitation status
    await adminClient
      .from("tenant_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation_id);

    // 2. Assign tenant to unit
    await adminClient
      .from("units")
      .update({ tenant_id: userId, status: "occupied" })
      .eq("id", invitation.unit_id);

    // 3. Ensure user has tenant role (upsert)
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "tenant")
      .maybeSingle();

    if (!existingRole) {
      // Update existing role to tenant or insert
      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: "tenant" }, { onConflict: "user_id,role" });
    }

    const unit = invitation.units as any;
    return new Response(JSON.stringify({
      success: true,
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
