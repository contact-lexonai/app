// Supabase Edge Function — notify-support
//
// Triggered by a Database Webhook on INSERT into `support_messages`.
// Sends an email to the site owner using Resend (resend.com).
//
// The recipient address lives ONLY in the `ADMIN_EMAIL` secret on
// Supabase's servers — it is never present in any file the browser
// can download, and never returned in any API response.
//
// One-time setup:
//   supabase secrets set RESEND_API_KEY=your_resend_key
//   supabase secrets set ADMIN_EMAIL=business.akashyaduvanshi@gmail.com
//   supabase functions deploy notify-support
//
// Then in Supabase Dashboard → Database → Webhooks, create a webhook:
//   Table: support_messages   Event: INSERT   Target: this function.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

serve(async (req) => {
  try {
    if (!RESEND_API_KEY || !ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Server is not configured with RESEND_API_KEY / ADMIN_EMAIL." }),
        { status: 500 }
      );
    }

    const payload = await req.json();
    const record = payload.record || payload;

    const subject = record.subject || "New support message";
    const message = record.message || "";
    const createdAt = record.created_at || new Date().toISOString();

    // Intentionally does NOT include the sender's email/name in this
    // notification — the admin can look the message up by its ID in
    // Supabase if needed, without the user's identity being pushed
    // into an inbox or any public-facing surface.
    const emailBody =
      "New support message received on LEXON AI.\n\n" +
      "Subject: " + subject + "\n" +
      "Received: " + createdAt + "\n\n" +
      "Message:\n" + message + "\n\n" +
      "View and manage it in your Supabase support_messages table.";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "LEXON AI <notifications@yourdomain.com>",
        to: [ADMIN_EMAIL],
        subject: "LEXON AI Support: " + subject,
        text: emailBody
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
