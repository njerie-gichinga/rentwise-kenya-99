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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { unit_id, title, description, priority, tenant_name } = await req.json();

    if (!unit_id || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up unit → property → landlord email
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("unit_number, properties!inner(name, landlord_id)")
      .eq("id", unit_id)
      .single();

    if (unitErr || !unit) {
      throw new Error("Unit not found");
    }

    const landlordId = (unit.properties as any).landlord_id;
    const propertyName = (unit.properties as any).name;

    // Get landlord email from auth
    const { data: { user: landlord }, error: userErr } = await supabase.auth.admin.getUserById(landlordId);
    if (userErr || !landlord?.email) {
      throw new Error("Landlord not found");
    }

    const priorityColor = priority === "high" ? "#dc2626" : priority === "medium" ? "#f59e0b" : "#22c55e";

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">New Maintenance Request</h2>
        <p>A tenant has submitted a repair request for your property.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>${propertyName}</strong> — Unit ${unit.unit_number}</p>
          <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600;">${title}</p>
          ${description ? `<p style="margin: 0 0 8px; color: #555; font-size: 14px;">${description}</p>` : ""}
          <p style="margin: 0;">
            <span style="display: inline-block; background: ${priorityColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${priority}</span>
          </p>
          ${tenant_name ? `<p style="margin: 8px 0 0; font-size: 13px; color: #666;">Submitted by: ${tenant_name}</p>` : ""}
        </div>
        <p style="color: #666; font-size: 13px;">Log in to RentEase to manage this request.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RentEase <onboarding@resend.dev>",
        to: [landlord.email],
        subject: `🔧 New repair request: ${title}`,
        html: emailHtml,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: "Failed to send email", details: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
