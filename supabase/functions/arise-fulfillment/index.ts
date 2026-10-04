import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PRODUCT_ID = "pro_01m428dqzbege0b6h8gh9rkv72";
const PRICE_ID = "pri_01m428fdnrr9rza69pzqf5th0v";
const DOWNLOAD_URL = "https://thearisearc.dewify.shop/The_Arise_Arc_Ebook.pdf";
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://thearisearc.dewify.shop",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getAdminClient() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const key = secretKeys
    ? JSON.parse(secretKeys).default
    : legacyServiceRoleKey;

  if (!key) {
    throw new Error("Supabase server key is unavailable.");
  }

  return createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseSignature(header: string | null) {
  if (!header) return null;

  const parts = header.split(";");
  const values: Record<string, string[]> = {};

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    values[key] ??= [];
    values[key].push(value);
  }

  const ts = values.ts?.[0];
  const signatures = values.h1 ?? [];

  if (!ts || !signatures.length) return null;
  return { ts, signatures };
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i += 1) {
    difference |= a[i] ^ b[i];
  }

  return difference === 0;
}

async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
) {
  const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET");

  if (!secret) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not configured.");
  }

  const parsed = parseSignature(signatureHeader);

  if (!parsed) return false;

  const timestampMs = Number(parsed.ts) * 1000;

  if (!Number.isFinite(timestampMs)) return false;
  if (Math.abs(Date.now() - timestampMs) > MAX_SIGNATURE_AGE_MS) return false;

  const signedPayload = parsed.ts + ":" + rawBody;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    ),
  );

  return parsed.signatures.some((signature) => {
    try {
      return timingSafeEqual(digest, hexToBytes(signature));
    } catch {
      return false;
    }
  });
}

function hasTargetPrice(data: any) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const lineItems = Array.isArray(data?.details?.line_items)
    ? data.details.line_items
    : [];

  const itemMatch = items.some(
    (item: any) =>
      item?.price?.id === PRICE_ID &&
      item?.price?.product_id === PRODUCT_ID,
  );

  const lineItemMatch = lineItems.some(
    (item: any) => item?.price_id === PRICE_ID,
  );

  return itemMatch || lineItemMatch;
}

async function handleWebhook(req: Request) {
  const rawBody = await req.text();

  if (
    !(await verifyPaddleSignature(
      rawBody,
      req.headers.get("Paddle-Signature"),
    ))
  ) {
    return response({ ok: false, error: "Invalid webhook signature." }, 401);
  }

  let event: any;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return response({ ok: false, error: "Invalid JSON." }, 400);
  }

  if (event?.event_type !== "transaction.completed") {
    return response({
      ok: true,
      ignored: true,
      event_type: event?.event_type ?? null,
    });
  }

  const data = event?.data;
  const transactionId = data?.id;

  if (!transactionId || data?.status !== "completed") {
    return response({ ok: false, error: "Transaction is not completed." }, 400);
  }

  if (!hasTargetPrice(data)) {
    return response({
      ok: false,
      error: "Transaction does not contain the ARISE ARC price.",
    }, 400);
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from("arise_purchases")
    .upsert(
      {
        transaction_id: transactionId,
        event_id: event?.event_id ?? null,
        product_id: PRODUCT_ID,
        price_id: PRICE_ID,
        status: "completed",
        customer_email: data?.customer?.email ?? null,
        currency_code: data?.currency_code ?? null,
        amount: data?.details?.totals?.total ?? null,
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "transaction_id" },
    );

  if (error) {
    console.error("fulfillment_store_failed", error);
    return response({
      ok: false,
      error: "Could not store fulfillment.",
    }, 500);
  }

  return response({
    ok: true,
    fulfilled: true,
    transaction_id: transactionId,
  });
}

async function handleClaim(req: Request) {
  let transactionId = new URL(req.url).searchParams.get("transaction_id");

  if (req.method === "POST") {
    try {
      const body = await req.json();
      transactionId = body?.transaction_id ?? transactionId;
    } catch {
      return response({ ok: false, error: "Invalid JSON." }, 400);
    }
  }

  if (!transactionId || !/^txn_[a-z0-9]{26}$/.test(transactionId)) {
    return response({
      ok: false,
      fulfilled: false,
      error: "Invalid transaction ID.",
    }, 400);
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("arise_purchases")
    .select("transaction_id, price_id, status, fulfilled_at")
    .eq("transaction_id", transactionId)
    .eq("status", "completed")
    .maybeSingle();

  if (error) {
    console.error("fulfillment_lookup_failed", error);
    return response({
      ok: false,
      fulfilled: false,
      error: "Fulfillment lookup failed.",
    }, 500);
  }

  if (!data) {
    return response({ ok: true, fulfilled: false });
  }

  return response({
    ok: true,
    fulfilled: true,
    transaction_id: data.transaction_id,
    download_url: DOWNLOAD_URL,
    fulfilled_at: data.fulfilled_at,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const path = new URL(req.url).pathname;

    if (path.endsWith("/webhook") && req.method === "POST") {
      return await handleWebhook(req);
    }

    if (req.method === "GET" || req.method === "POST") {
      return await handleClaim(req);
    }

    return response({ ok: false, error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("arise_fulfillment_error", error);
    return response({
      ok: false,
      error: "Fulfillment service unavailable.",
    }, 500);
  }
});
