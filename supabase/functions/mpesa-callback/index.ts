import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

    const callback = body?.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (resultCode === 0) {
      // Payment successful — extract M-Pesa receipt number
      const items = callback.CallbackMetadata?.Item || [];
      const receiptNumber = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || null;

      await adminClient
        .from("payments")
        .update({
          status: "completed",
          mpesa_ref: receiptNumber,
        })
        .eq("checkout_request_id", checkoutRequestId)
        .eq("status", "pending");

      console.log(`Payment ${checkoutRequestId} completed. Receipt: ${receiptNumber}`);
    } else {
      // Payment failed or cancelled
      await adminClient
        .from("payments")
        .update({ status: "failed" })
        .eq("checkout_request_id", checkoutRequestId)
        .eq("status", "pending");

      console.log(`Payment ${checkoutRequestId} failed. Code: ${resultCode}`);
    }

    // M-Pesa expects this response format
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
