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
    console.log("Rent reminder cron triggered at:", new Date().toISOString());

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all occupied units with tenant info
    const { data: units, error: unitsError } = await adminClient
      .from("units")
      .select("id, unit_number, rent_amount, tenant_id, property_id, properties!inner(name)")
      .eq("status", "occupied")
      .not("tenant_id", "is", null);

    if (unitsError) throw new Error(unitsError.message);
    if (!units || units.length === 0) {
      return new Response(JSON.stringify({ message: "No occupied units found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Determine reminder type based on day of month
    // Rent is due on the 1st. Remind on 28th/29th (3 days before), 1st (due day), 5th (overdue)
    let reminderType: string | null = null;
    let title = "";
    let messageTemplate = "";

    if (dayOfMonth === daysInMonth - 2 || dayOfMonth === daysInMonth - 1) {
      // 3 days or 2 days before month end
      reminderType = "upcoming";
      title = "Rent Due Soon";
      messageTemplate = "Your rent of KES {amount} for Unit {unit} at {property} is due in a few days.";
    } else if (dayOfMonth === 1) {
      reminderType = "due_today";
      title = "Rent Due Today";
      messageTemplate = "Your rent of KES {amount} for Unit {unit} at {property} is due today. Please pay to avoid late fees.";
    } else if (dayOfMonth === 5) {
      reminderType = "overdue";
      title = "⚠️ Rent Overdue";
      messageTemplate = "Your rent of KES {amount} for Unit {unit} at {property} is overdue. Please pay immediately.";
    }

    if (!reminderType) {
      return new Response(JSON.stringify({ message: "No reminder needed today", day: dayOfMonth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which tenants already paid this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const { data: paidPayments } = await adminClient
      .from("payments")
      .select("tenant_id, unit_id")
      .gte("payment_date", startOfMonth)
      .eq("status", "completed");

    const paidSet = new Set((paidPayments || []).map((p: any) => `${p.tenant_id}:${p.unit_id}`));

    // Get tenant phone numbers for SMS
    const tenantIds = [...new Set(units.map((u: any) => u.tenant_id))];
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, phone")
      .in("user_id", tenantIds);

    const phoneMap = new Map((profiles || []).map((p: any) => [p.user_id, p.phone]));

    // Create notifications for unpaid tenants
    const notifications: any[] = [];
    const smsNumbers: string[] = [];

    for (const unit of units) {
      const key = `${unit.tenant_id}:${unit.id}`;
      if (paidSet.has(key)) continue; // Already paid

      const propertyName = (unit as any).properties?.name || "your property";
      const msg = messageTemplate
        .replace("{amount}", unit.rent_amount.toLocaleString())
        .replace("{unit}", unit.unit_number)
        .replace("{property}", propertyName);

      notifications.push({
        user_id: unit.tenant_id,
        title,
        message: msg,
        type: "rent_reminder",
        metadata: { unit_id: unit.id, reminder_type: reminderType },
      });

      const phone = phoneMap.get(unit.tenant_id);
      if (phone) smsNumbers.push(phone);
    }

    if (notifications.length > 0) {
      const { error: insertErr } = await adminClient.from("notifications").insert(notifications);
      if (insertErr) console.error("Notification insert error:", insertErr);
    }

    // Send SMS if Africa's Talking is configured
    let smsResult = null;
    const atApiKey = Deno.env.get("AT_API_KEY");
    const atUsername = Deno.env.get("AT_USERNAME");

    if (atApiKey && atUsername && smsNumbers.length > 0) {
      try {
        const formattedNumbers = smsNumbers.map((p: string) => {
          let num = p.replace(/\s+/g, "").replace(/^0/, "+254").replace(/^254/, "+254");
          if (!num.startsWith("+")) num = "+" + num;
          return num;
        });

        // Send individual SMS with personalized messages
        for (let i = 0; i < notifications.length; i++) {
          const phone = smsNumbers[i];
          if (!phone) continue;
          let num = phone.replace(/\s+/g, "").replace(/^0/, "+254").replace(/^254/, "+254");
          if (!num.startsWith("+")) num = "+" + num;

          const smsBody = new URLSearchParams({
            username: atUsername,
            to: num,
            message: `${notifications[i].title}\n${notifications[i].message}`,
          });

          const atSandbox = atUsername === "sandbox";
          const atBaseUrl = atSandbox
            ? "https://api.sandbox.africastalking.com/version1/messaging"
            : "https://api.africastalking.com/version1/messaging";
          await fetch(atBaseUrl, {
            method: "POST",
            headers: {
              apiKey: atApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: smsBody.toString(),
          }).catch((e) => console.error("SMS error:", e));
        }
        smsResult = { sent: smsNumbers.length };
      } catch (e) {
        console.error("SMS batch error:", e);
        smsResult = { error: e.message };
      }
    }

    console.log(`Sent ${notifications.length} rent reminders (${reminderType})`);

    return new Response(
      JSON.stringify({
        success: true,
        reminder_type: reminderType,
        notifications_sent: notifications.length,
        sms: smsResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("rent-reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
