import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DOCUSIGN_INTEGRATION_KEY = Deno.env.get("DOCUSIGN_INTEGRATION_KEY")!;
const DOCUSIGN_USER_ID = Deno.env.get("DOCUSIGN_USER_ID")!;
const DOCUSIGN_ACCOUNT_ID = Deno.env.get("DOCUSIGN_ACCOUNT_ID")!;
// RSA key stored as base64 to avoid newline issues in env vars
const DOCUSIGN_RSA_PRIVATE_KEY = (() => {
  const b64 = Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY_B64");
  if (b64) return atob(b64);
  return Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY") || "";
})();
const DOCUSIGN_BASE_URL =
  Deno.env.get("DOCUSIGN_BASE_URL") || "https://demo.docusign.net/restapi";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendDocuSignPayload {
  signer_email: string;
  signer_name: string;
  quote_reference: string;
  project_reference: string;
  pdf_base64: string;
}

// Wrap PKCS#1 RSA key in PKCS#8 envelope for Web Crypto API
function wrapPkcs1InPkcs8(pkcs1Bytes: Uint8Array): Uint8Array {
  // PKCS#8 header for RSA: SEQUENCE { INTEGER(0), SEQUENCE { OID(rsaEncryption), NULL }, OCTET STRING { pkcs1 } }
  const oid = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);

  // Build OCTET STRING wrapping the PKCS#1 key
  const octetStr = asn1Wrap(0x04, pkcs1Bytes);
  // Build outer SEQUENCE
  const inner = new Uint8Array([...version, ...oid, ...octetStr]);
  return asn1Wrap(0x30, inner);
}

function asn1Wrap(tag: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let header: number[];
  if (len < 128) {
    header = [tag, len];
  } else if (len < 256) {
    header = [tag, 0x81, len];
  } else if (len < 65536) {
    header = [tag, 0x82, (len >> 8) & 0xff, len & 0xff];
  } else {
    header = [tag, 0x83, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  }
  const result = new Uint8Array(header.length + len);
  result.set(header);
  result.set(content, header.length);
  return result;
}

// Convert PEM to CryptoKey for signing
async function importRSAKey(pem: string): Promise<CryptoKey> {
  // Handle literal \n from env vars
  const normalizedPem = pem.replace(/\\n/g, "\n");
  const isPkcs1 = normalizedPem.includes("BEGIN RSA PRIVATE KEY");
  const pemContents = normalizedPem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
    .replace(/-----END RSA PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  let binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // PKCS#1 keys need to be wrapped in PKCS#8 for Web Crypto
  if (isPkcs1) {
    binaryDer = wrapPkcs1InPkcs8(binaryDer);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Base64url encode
function base64url(data: string | Uint8Array): string {
  const str =
    typeof data === "string"
      ? btoa(data)
      : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Create JWT and get access token
async function getDocuSignToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    JSON.stringify({ typ: "JWT", alg: "RS256" })
  );
  const payload = base64url(
    JSON.stringify({
      iss: DOCUSIGN_INTEGRATION_KEY,
      sub: DOCUSIGN_USER_ID,
      aud: "account-d.docusign.com",
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    })
  );

  const signingInput = `${header}.${payload}`;
  const key = await importRSAKey(DOCUSIGN_RSA_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const sig = base64url(new Uint8Array(signature));
  const jwt = `${signingInput}.${sig}`;

  const res = await fetch(
    "https://account-d.docusign.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    }
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`DocuSign auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Build T&Cs HTML document
function buildTermsHTML(quoteRef: string): string {
  return `
    <html><body style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto">
      <h1 style="color:#1a1a2e">Terms & Conditions</h1>
      <p><strong>Quotation Reference:</strong> ${quoteRef}</p>
      <h3>1. Payment Terms</h3>
      <p>50% deposit upon acceptance. 50% upon project completion or as agreed in writing.</p>
      <h3>2. Validity</h3>
      <p>This quotation is valid for 30 days from the date of issue.</p>
      <h3>3. Scope of Work</h3>
      <p>Work shall be carried out as described in the attached Bill of Quantities. Any variations must be agreed in writing.</p>
      <h3>4. Variations</h3>
      <p>Any changes to the scope of work will be subject to a variation order and may affect the total price and timeline.</p>
      <h3>5. Access & Permits</h3>
      <p>The client shall provide adequate access to the site. All permit fees and related charges are the responsibility of the client unless otherwise stated.</p>
      <h3>6. Warranty</h3>
      <p>Bolsover Building Contracting LLC provides a 12-month defects liability period from the date of practical completion.</p>
      <h3>7. Governing Law</h3>
      <p>This agreement is governed by the laws of the United Arab Emirates.</p>
      <br/><br/>
      <p><strong>Accepted and Agreed:</strong></p>
      <br/><br/>
      <p>Signature: ___________________________</p>
      <p>Name: ___________________________</p>
      <p>Date: ___________________________</p>
    </body></html>
  `;
}

// Build contract HTML document
function buildContractHTML(
  quoteRef: string,
  projectRef: string,
  signerName: string
): string {
  return `
    <html><body style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto">
      <h1 style="color:#1a1a2e">Works Agreement</h1>
      <p><strong>Reference:</strong> ${quoteRef}</p>
      <p><strong>Project:</strong> ${projectRef}</p>
      <br/>
      <p>This Agreement is entered into between <strong>Bolsover Building Contracting LLC</strong> ("the Contractor") and <strong>${signerName}</strong> ("the Client").</p>
      <h3>1. Scope</h3>
      <p>The Contractor agrees to carry out the works as described in the attached Bill of Quantities (BOQ) and in accordance with the Terms & Conditions.</p>
      <h3>2. Contract Price</h3>
      <p>The contract price shall be as stated in the quotation ${quoteRef}, subject to any agreed variations.</p>
      <h3>3. Commencement</h3>
      <p>Works shall commence within 14 days of receipt of the deposit payment, subject to site access and any required permits.</p>
      <h3>4. Completion</h3>
      <p>The estimated completion timeline will be confirmed upon commencement and is subject to site conditions and client approvals.</p>
      <h3>5. Acceptance</h3>
      <p>By signing below, the Client confirms acceptance of the quotation, Terms & Conditions, and this Works Agreement.</p>
      <br/><br/>
      <p><strong>For and on behalf of the Client:</strong></p>
      <br/><br/>
      <p>Signature: ___________________________</p>
      <p>Name: ___________________________</p>
      <p>Date: ___________________________</p>
      <br/>
      <p><strong>For and on behalf of Bolsover Building Contracting LLC:</strong></p>
      <br/><br/>
      <p>Signature: ___________________________</p>
      <p>Name: ___________________________</p>
      <p>Date: ___________________________</p>
    </body></html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SendDocuSignPayload = await req.json();

    if (!payload.signer_email || !payload.signer_name) {
      throw new Error("Signer email and name are required");
    }

    if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_RSA_PRIVATE_KEY) {
      throw new Error(
        "DocuSign credentials not configured. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, and DOCUSIGN_RSA_PRIVATE_KEY in Edge Function secrets."
      );
    }

    const token = await getDocuSignToken();

    const termsHTML = buildTermsHTML(payload.quote_reference);
    const contractHTML = buildContractHTML(
      payload.quote_reference,
      payload.project_reference,
      payload.signer_name
    );

    // Build envelope definition
    const envelope = {
      emailSubject: `Documents for Signature — ${payload.quote_reference} — Bolsover Building Contracting`,
      emailBlurb: `Please review and sign the attached documents for ${payload.quote_reference}.`,
      status: "sent",
      documents: [
        {
          documentId: "1",
          name: `BOQ - ${payload.quote_reference}.pdf`,
          documentBase64: payload.pdf_base64,
          fileExtension: "pdf",
        },
        {
          documentId: "2",
          name: "Terms and Conditions.html",
          documentBase64: btoa(termsHTML),
          fileExtension: "html",
        },
        {
          documentId: "3",
          name: "Works Agreement.html",
          documentBase64: btoa(contractHTML),
          fileExtension: "html",
        },
      ],
      recipients: {
        signers: [
          {
            email: payload.signer_email,
            name: payload.signer_name,
            recipientId: "1",
            routingOrder: "1",
            tabs: {
              signHereTabs: [
                {
                  documentId: "2",
                  pageNumber: "1",
                  xPosition: "100",
                  yPosition: "600",
                },
                {
                  documentId: "3",
                  pageNumber: "1",
                  xPosition: "100",
                  yPosition: "650",
                },
              ],
            },
          },
        ],
      },
    };

    const envelopeRes = await fetch(
      `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envelope),
      }
    );

    const envelopeData = await envelopeRes.json();

    if (!envelopeRes.ok) {
      throw new Error(
        `DocuSign API error: ${envelopeData.message || JSON.stringify(envelopeData)}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        envelope_id: envelopeData.envelopeId,
      }),
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
