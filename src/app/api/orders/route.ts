import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPromotion } from "@/lib/promotions";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

const schema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(10).max(20).regex(/^[+0-9()\-\s]+$/),
  fulfillment: z.enum(["delivery", "pickup"]),
  branchId: z.string().uuid(),
  address: z.object({
    area: z.string().trim().min(2).max(120),
    street: z.string().trim().min(2).max(180),
    building: z.string().trim().max(40).optional(),
    floor: z.string().trim().max(40).optional(),
    landmark: z.string().trim().max(180).optional(),
  }).nullable(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({ variantId: z.string().uuid().optional(), offerId: z.string().regex(/^[a-z0-9-]+$/).optional(), quantity: z.number().int().min(1).max(20) }).refine(item => Boolean(item.variantId) !== Boolean(item.offerId), { message: "يجب تحديد منتج أو عرض واحد فقط" })).min(1).max(30),
  idempotencyKey: z.string().uuid(),
}).refine(v => v.fulfillment !== "delivery" || v.address !== null, { message: "عنوان التوصيل مطلوب", path: ["address"] });

export async function POST(request: NextRequest) {
  // Cloudflare Worker secrets are runtime bindings; process.env alone may not expose them.
  const { env: cloudflareEnv } = await getCloudflareContext({ async: true });
  const runtimeEnv = cloudflareEnv as {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
  const url = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyKind = !serviceKey
    ? "missing"
    : serviceKey.startsWith("sb_secret_")
      ? "sb_secret"
      : serviceKey.startsWith("sb_publishable_")
        ? "publishable"
        : serviceKey.startsWith("eyJ")
          ? "legacy_jwt"
          : "unknown";
  console.info("[orders] Supabase credential diagnostics", {
    runtimeBindingPresent: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
    processEnvPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    keyKind,
  });
  if (!url || !serviceKey) {
    console.error("[orders] missing server configuration", { hasUrl: Boolean(url), hasServiceKey: Boolean(serviceKey) });
    return NextResponse.json({ error: "إعدادات تسجيل الطلبات غير مكتملة على الخادم. يرجى المحاولة لاحقًا." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات الطلب وتأكد من إدخالها بشكل صحيح." }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const input = parsed.data;
  const { data: existing } = await admin.from("orders").select("id,order_number,total").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json({ orderId: existing.id, orderNumber: existing.order_number, total: Number(existing.total) });

  const { data: branch, error: branchError } = await admin.from("branches")
    .select("id,name_ar,accepts_delivery,accepts_pickup,is_active").eq("id", input.branchId).eq("is_active", true).maybeSingle();
  if (branchError || !branch) return NextResponse.json({ error: "الفرع غير متاح حاليًا." }, { status: 400 });
  if (input.fulfillment === "delivery" && !branch.accepts_delivery) return NextResponse.json({ error: "الفرع لا يقبل طلبات التوصيل." }, { status: 400 });
  if (input.fulfillment === "pickup" && !branch.accepts_pickup) return NextResponse.json({ error: "الفرع لا يقبل الاستلام من الفرع." }, { status: 400 });

  const variantIds = [...new Set(input.items.flatMap(item => item.variantId ? [item.variantId] : []))];
  const { data: variants, error: variantError } = variantIds.length
    ? await admin.from("product_variants")
        .select("id,product_id,name_ar,name_en,sku,base_price,products!inner(id,name_ar,name_en,sku,is_active)")
        .in("id", variantIds).eq("is_active", true).eq("products.is_active", true)
    : { data: [], error: null };
  if (variantError || !variants || variants.length !== variantIds.length) return NextResponse.json({ error: "بعض المنتجات لم تعد متاحة. حدّث المنيو وحاول مرة أخرى." }, { status: 400 });

  const byId = new Map(variants.map(v => [v.id, v]));
  const lines = input.items.map(item => {
    if (item.offerId) {
      const offer = getPromotion(item.offerId);
      if (!offer) return null;
      return {
        product_id: null, variant_id: null,
        product_name_ar: offer.title, product_name_en: offer.nameEn,
        variant_name_ar: "عرض كامل", variant_name_en: "Complete offer",
        sku_snapshot: `OFFER-${offer.id}`,
        quantity: item.quantity, unit_price: offer.price, line_total: Number((offer.price * item.quantity).toFixed(2)),
        addons_snapshot: [{ type: "promotion", offer_id: offer.id, description: offer.description }],
      };
    }
    const variant = byId.get(item.variantId!);
    if (!variant) return null;
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    const price = Number(variant.base_price);
    return {
      product_id: variant.product_id, variant_id: variant.id,
      product_name_ar: product.name_ar, product_name_en: product.name_en,
      variant_name_ar: variant.name_ar, variant_name_en: variant.name_en,
      sku_snapshot: variant.sku || product.sku || null,
      quantity: item.quantity, unit_price: price, line_total: Number((price * item.quantity).toFixed(2)),
      addons_snapshot: [],
    };
  });
  if (lines.some(line => !line)) return NextResponse.json({ error: "أحد العروض أو المنتجات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى." }, { status: 400 });
  const validLines = lines.filter((line): line is NonNullable<typeof line> => line !== null);
  const subtotal = Number(validLines.reduce((sum, line) => sum + line.line_total, 0).toFixed(2));
  // Delivery zones are not configured yet, so do not invent a fee; the branch confirms it with the customer.
  const deliveryFee = 0;
  const { data: order, error: orderError } = await admin.from("orders").insert({
    branch_id: branch.id, fulfillment: input.fulfillment, payment_method: "cash",
    payment_status: "pending", status: "pending_confirmation",
    customer_name: input.customerName, customer_phone: input.customerPhone,
    delivery_address_snapshot: input.fulfillment === "delivery" ? input.address : null,
    customer_notes: input.notes || null, subtotal, discount_total: 0,
    delivery_fee: deliveryFee, total: subtotal + deliveryFee, idempotency_key: input.idempotencyKey,
  }).select("id,order_number,total").single();
  if (orderError || !order) {
    if (orderError?.code === "23505") {
      const { data: duplicate } = await admin.from("orders").select("id,order_number,total").eq("idempotency_key", input.idempotencyKey).maybeSingle();
      if (duplicate) return NextResponse.json({ orderId: duplicate.id, orderNumber: duplicate.order_number, total: Number(duplicate.total) });
    }
    console.error("[orders] order insert failed", { code: orderError?.code, message: orderError?.message, details: orderError?.details, hint: orderError?.hint });
    return NextResponse.json({ error: "لم نتمكن من تسجيل الطلب. حاول مرة أخرى بعد قليل." }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("order_items").insert(validLines.map(line => ({ ...line, order_id: order.id })));
  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    console.error("[orders] order items insert failed", itemsError.message);
    return NextResponse.json({ error: "تعذر حفظ تفاصيل الطلب. لم يتم اعتماد الطلب، حاول مرة أخرى." }, { status: 500 });
  }
  const { error: paymentError } = await admin.from("payments").insert({
    order_id: order.id, provider: "cash", amount: order.total, currency: "EGP", status: "pending",
  });
  if (paymentError) {
    await admin.from("orders").delete().eq("id", order.id);
    console.error("[orders] cash payment insert failed", paymentError.message);
    return NextResponse.json({ error: "تعذر تسجيل طريقة الدفع. حاول مرة أخرى." }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, total: Number(order.total) }, { status: 201 });
}
