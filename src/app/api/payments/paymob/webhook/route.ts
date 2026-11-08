import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const hmacFields = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refund", "is_standalone_payment",
  "is_voided", "order.id", "owner", "pending", "source_data.pan",
  "source_data.sub_type", "source_data.type",
] as const;

function readPath(value: Record<string, unknown>, path: string): string {
  const result = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return "";
    return (current as Record<string, unknown>)[key];
  }, value);
  return String(result ?? "");
}

function validHmac(obj: Record<string, unknown>, received: string, secret: string) {
  const message = hmacFields.map((field) => readPath(obj, field)).join("");
  const expected = createHmac("sha512", secret).update(message).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(received, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || !supabaseUrl || !serviceKey) {
    console.error("[Paymob webhook] Missing server environment configuration.");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  let payload: { obj?: Record<string, unknown>; hmac?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = payload.obj;
  const receivedHmac = String(payload.hmac ?? request.nextUrl.searchParams.get("hmac") ?? "");
  if (!obj || !receivedHmac || !validHmac(obj, receivedHmac, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const providerOrderId = String((obj.order as Record<string, unknown> | undefined)?.id ?? "");
  const transactionId = String(obj.id ?? "");
  const amountCents = Number(obj.amount_cents);
  const currency = String(obj.currency ?? "");
  if (!providerOrderId || !transactionId || !Number.isSafeInteger(amountCents) || amountCents <= 0 || currency !== "EGP") {
    return NextResponse.json({ error: "Invalid transaction details" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: payment, error: lookupError } = await supabase
    .from("payments")
    .select("id,order_id,amount,status")
    .eq("provider", "paymob")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();

  if (lookupError) {
    console.error("[Paymob webhook] Payment lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const expectedCents = Math.round(Number(payment.amount) * 100);
  if (!Number.isFinite(expectedCents) || expectedCents !== amountCents) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 409 });
  }

  const paid = obj.success === true && obj.pending !== true && obj.error_occured !== true;
  const failed = obj.success === false || obj.error_occured === true;
  const nextStatus = paid ? "paid" : failed ? "failed" : "pending";

  if (payment.status !== "paid" || nextStatus === "paid") {
    const { error: paymentError } = await supabase.from("payments").update({
      status: nextStatus,
      provider_transaction_id: transactionId,
      provider_payload: { transaction_id: transactionId, success: obj.success, pending: obj.pending, error_occured: obj.error_occured, currency },
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    if (paymentError) {
      console.error("[Paymob webhook] Payment update failed:", paymentError.message);
      return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
    }
    const { error: orderError } = await supabase.from("orders").update({ payment_status: nextStatus }).eq("id", payment.order_id);
    if (orderError) {
      console.error("[Paymob webhook] Order payment status update failed:", orderError.message);
      return NextResponse.json({ error: "Order update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
