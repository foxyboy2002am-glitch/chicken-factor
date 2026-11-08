import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  idempotencyKey: z.string().uuid(),
}).refine(v => v.fulfillment !== "delivery" || v.address !== null, { message: "عنوان التوصيل مطلوب", path: ["address"] });

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "خدمة تسجيل الطلبات غير مهيأة على الخادم. يرجى التواصل مع الإدارة." }, { status: 503 });
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

  const variantIds = [...new Set(input.items.map(item => item.variantId))];
  const { data: variants, error: variantError } = await admin.from("product_variants")
    .select("id,product_id,name_ar,name_en,sku,base_price,products!inner(id,name_ar,name_en,sku,is_active)")
    .in("id", variantIds).eq("is_active", true).eq("products.is_active", true);
  if (variantError || !variants || variants.length !== variantIds.length) return NextResponse.json({ error: "بعض المنتجات لم تعد متاحة. حدّث المنيو وحاول مرة أخرى." }, { status: 400 });

  const byId = new Map(variants.map(v => [v.id, v]));
  const lines = input.items.map(item => {
    const variant = byId.get(item.variantId)!;
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
  const subtotal = Number(lines.reduce((sum, line) => sum + line.line_total, 0).toFixed(2));
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
    console.error("[orders] order insert failed", orderError?.message);
    return NextResponse.json({ error: "لم نتمكن من تسجيل الطلب. حاول مرة أخرى بعد قليل." }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("order_items").insert(lines.map(line => ({ ...line, order_id: order.id })));
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
