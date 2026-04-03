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

  try {
    const {
      user_ids,
      title,
      message,
      type = "general",
      metadata = {},
      send_sms = false,
      phone_numbers = [],
    } = await req.json();

    if (!user_ids?.length || !title || !message) {
      return new Response(
        JSON.stringify({ error: "user_ids, title, message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create in-app notifications for all users
    const notifications = user_ids.map((uid: string) => ({
      user_id: uid,
      title,
      message,
      type,
      metadata,
    }));

    const { error: insertError } = await adminClient
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(insertError.message);
    }

    // Send SMS via Africa's Talking if enabled
    let smsResult = null;
    if (send_sms && phone_numbers.length > 0) {
      const atApiKey = Deno.env.get("AT_API_KEY");
      const atUsername = Deno.env.get("AT_USERNAME");

      if (atApiKey && atUsername) {
        try {
          // Format phone numbers to international format
          const formattedNumbers = phone_numbers.map((p: string) => {
            let num = p.replace(/\s+/g, "").replace(/^0/, "+254").replace(/^254/, "+254");
            if (!num.startsWith("+")) num = "+" + num;
            return num;
          });

          const smsBody = new URLSearchParams({
            username: atUsername,
            to: formattedNumbers.join(","),
            message: `${title}\n${message}`,
          });

          const atSandbox = atUsername === "sandbox";
          const atBaseUrl = atSandbox
            ? "https://api.sandbox.africastalking.com/version1/messaging"
            : "https://api.africastalking.com/version1/messaging";
          console.log(`Using AT ${atSandbox ? "sandbox" : "production"} API`);
          const smsRes = await fetch(atBaseUrl, {
            method: "POST",
            headers: {
              apiKey: atApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: smsBody.toString(),
          });

          const smsText = await smsRes.text();
          console.log("SMS response:", smsText);
          try {
            smsResult = JSON.parse(smsText);
          } catch {
            smsResult = { raw: smsText };
          }
        } catch (smsErr) {
          console.error("SMS send error:", smsErr);
          smsResult = { error: smsErr.message };
        }
      } else {
        console.warn("Africa's Talking credentials not configured — skipping SMS");
        smsResult = { skipped: true, reason: "credentials not configured" };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: user_ids.length,
        sms: smsResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
