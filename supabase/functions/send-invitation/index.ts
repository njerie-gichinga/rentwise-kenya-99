import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const { tenant_name, tenant_email, property_name, unit_number } = await req.json();

    if (!tenant_email || !tenant_name) {
      return new Response(JSON.stringify({ error: "Missing tenant_name or tenant_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build signup link for the tenant
    const signupUrl = `${SUPABASE_URL.replace("supabase.co", "lovable.app").replace("https://", "https://id-preview--").split(".supabase.co")[0]}`; 
    // We'll use a simple approach: direct tenant to the app's signup page
    const appUrl = Deno.env.get("APP_URL") || SUPABASE_URL;
    const signupLink = `${appUrl}/signup?email=${encodeURIComponent(tenant_email)}`;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Welcome to RentWise!</h2>
        <p>Hi <strong>${tenant_name}</strong>,</p>
        <p>Your landlord has invited you to manage your rental on RentWise. You've been assigned to:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>${property_name}</strong> — Unit ${unit_number}</p>
        </div>
        <p>Click the button below to create your account:</p>
        <a href="${signupLink}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Set Up My Account
        </a>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">
          If the button doesn't work, copy and paste this link: ${signupLink}
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RentWise <onboarding@resend.dev>",
        to: [tenant_email],
        subject: `${tenant_name}, you've been invited to RentWise`,
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

    return new Response(JSON.stringify({ success: true, id: result.id }), {
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
