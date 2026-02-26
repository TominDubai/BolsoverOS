import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("QUOTE_FROM_EMAIL") || "onboarding@resend.dev";
const COMPANY_NAME = Deno.env.get("COMPANY_NAME") || "Bolsover Building Contracting LLC";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendQuotePayload {
  client_email: string;
  client_name: string;
  quote_reference: string;
  project_reference: string;
  total_price: number;
  pdf_base64: string;
}

function buildEmailHTML(payload: SendQuotePayload): string {
  const formattedTotal = new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(payload.total_price);

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;padding:20px">
      <div style="background:#1a1a2e;padding:24px 32px;border-radius:10px 10px 0 0">
        <h1 style="color:#fff;font-size:20px;margin:0">${COMPANY_NAME}</h1>
        <p style="color:#aab;font-size:13px;margin:4px 0 0">Quotation</p>
      </div>
      <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
        <p style="font-size:14px;color:#333">Dear ${payload.client_name},</p>
        <p style="font-size:14px;color:#333">
          Please find attached our quotation <strong>${payload.quote_reference}</strong>
          ${payload.project_reference ? ` for project <strong>${payload.project_reference}</strong>` : ""}.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-size:13px;color:#64748b">Total Amount (Tax Inclusive)</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1a1a2e">${formattedTotal}</p>
        </div>
        <p style="font-size:14px;color:#333">
          The quotation is attached as a PDF for your review. Please do not hesitate to contact us
          should you have any questions or require further clarification.
        </p>
        <p style="font-size:14px;color:#333">
          We look forward to hearing from you.
        </p>
        <p style="font-size:14px;color:#333">Kind regards,<br><strong>${COMPANY_NAME}</strong></p>
      </div>
      <p style="font-size:11px;color:#999;text-align:center;margin-top:16px">
        This quotation was sent from ${COMPANY_NAME}.
      </p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SendQuotePayload = await req.json();

    if (!payload.client_email) {
      throw new Error("Client email address is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY not configured. Set it in Supabase Edge Function secrets."
      );
    }

    const html = buildEmailHTML(payload);

    const emailBody: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [payload.client_email],
      subject: `Quotation ${payload.quote_reference} — ${COMPANY_NAME}`,
      html,
    };

    // Attach PDF if provided
    if (payload.pdf_base64) {
      emailBody.attachments = [
        {
          filename: `${payload.quote_reference || "Quote"}.pdf`,
          content: payload.pdf_base64,
        },
      ];
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      throw new Error(
        `Email API error: ${emailData.message || JSON.stringify(emailData)}`
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
