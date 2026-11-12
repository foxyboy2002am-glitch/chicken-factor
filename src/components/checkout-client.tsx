"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Branch = { id: string; name_ar: string; accepts_delivery: boolean; accepts_pickup: boolean };
type CartItem = { productId?: string; variantId?: string; offerId?: string; productName: string; variantName: string; price: number; quantity: number };
const cartLineKey = (item: CartItem) => item.offerId ? `offer:${item.offerId}` : `variant:${item.variantId || item.productId || item.productName}`;
const CART_KEY = "cf-store-cart-v1";
const money = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);

export default function CheckoutClient({ branches }: { branches: Branch[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber: number; total: number } | null>(null);
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      setCart(Array.isArray(saved) ? saved : []);
    } catch { setCart([]); }
  }, []);

  const eligibleBranches = branches.filter(b => fulfillment === "delivery" ? b.accepts_delivery : b.accepts_pickup);
  useEffect(() => {
    if (!eligibleBranches.some(b => b.id === branchId)) setBranchId(eligibleBranches[0]?.id || "");
  }, [fulfillment, branches, branchId]);

  function updateQuantity(lineKey: string, quantity: number) {
    const next = cart.map(item => cartLineKey(item) === lineKey ? { ...item, quantity } : item).filter(item => item.quantity > 0);
    setCart(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cf-cart-updated"));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cart.length) { setError("السلة فارغة. ارجع للمنيو وأضف المنتجات أولاً."); return; }
    if (!branchId) { setError("اختار الفرع المناسب."); return; }
    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: String(form.get("customerName") || ""),
      customerPhone: String(form.get("customerPhone") || ""),
      fulfillment,
      branchId,
      address: fulfillment === "delivery" ? {
        area: String(form.get("area") || ""),
        street: String(form.get("street") || ""),
        building: String(form.get("building") || ""),
        floor: String(form.get("floor") || ""),
        landmark: String(form.get("landmark") || ""),
      } : null,
      notes: String(form.get("notes") || ""),
      items: cart.map(item => item.offerId ? ({ offerId: item.offerId, quantity: item.quantity }) : ({ variantId: item.variantId, quantity: item.quantity })),
      idempotencyKey: crypto.randomUUID(),
    };
    setBusy(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل الطلب.");
      setSuccess({ orderNumber: result.orderNumber, total: result.total });
      setCart([]);
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new Event("cf-cart-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally { setBusy(false); }
  }

  if (success) return <main className="cf-checkout-page" dir="rtl"><section className="cf-checkout-card cf-order-success"><div className="cf-success-mark">✓</div><h1>تم استلام طلبك بنجاح</h1><p>رقم الطلب: <strong>#{success.orderNumber}</strong></p><p>الإجمالي: <strong>{money(success.total)} جنيه</strong></p><p>الفرع هيتواصل معاك لتأكيد الطلب ومصاريف التوصيل إن وجدت.</p><a href="/menu" className="cf-submit-order">العودة للمنيو</a></section></main>;

  return <main className="cf-checkout-page" dir="rtl">
    <header className="cf-checkout-header"><a href="/menu">← العودة للمنيو</a><span className="cf-checkout-brand">CHICKEN FACTOR <b>•</b> ORDER ONLINE</span></header>
    <section className="cf-checkout-hero"><span>خطوة واحدة تفصلك عن وجبتك</span><h1>كمّل طلبك، وإحنا نهتم بالباقي!</h1><p>راجع طلبك واختار طريقة الاستلام والفرع المناسب.</p><div className="cf-checkout-hero-stamp">FRESH<br/>CRISPY<br/>DAILY</div></section>
    <div className="cf-checkout-layout">
      <section className="cf-checkout-card">
        <h2>بيانات الطلب</h2>
        {!cart.length ? <p className="cf-empty-cart">السلة فارغة. <a href="/menu">اختار منتجات من المنيو</a>.</p> : cart.map(item => <div className="cf-cart-line" key={cartLineKey(item)}>
          <div><strong>{item.productName}</strong><small>{item.offerId ? "عرض كامل" : item.variantName} · {money(item.price)} جنيه</small></div>
          <div className="cf-quantity"><button type="button" onClick={() => updateQuantity(cartLineKey(item), item.quantity - 1)} aria-label="تقليل الكمية">−</button><b>{item.quantity}</b><button type="button" onClick={() => updateQuantity(cartLineKey(item), Math.min(20, item.quantity + 1))} aria-label="زيادة الكمية">+</button></div>
          <strong>{money(item.price * item.quantity)} ج</strong>
        </div>)}
        <div className="cf-total-line"><span>الإجمالي المبدئي</span><strong>{money(total)} جنيه</strong></div>
      </section>
      <form className="cf-checkout-card cf-checkout-form" onSubmit={submit}>
        <h2>بيانات العميل والاستلام</h2>
        <label>الاسم بالكامل<input name="customerName" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>رقم الموبايل<input name="customerPhone" required type="tel" inputMode="tel" minLength={10} maxLength={20} autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
        <label>طريقة الاستلام<select value={fulfillment} onChange={e => setFulfillment(e.target.value as "delivery" | "pickup")}><option value="delivery">توصيل للعنوان</option><option value="pickup">استلام من الفرع</option></select></label>
        <label>الفرع<select value={branchId} onChange={e => setBranchId(e.target.value)} required><option value="">اختار الفرع</option>{eligibleBranches.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></label>
        {fulfillment === "delivery" ? <div className="cf-address-fields">
          <label>المنطقة / الحي<input name="area" required maxLength={120} /></label>
          <label>الشارع<input name="street" required maxLength={180} /></label>
          <div className="cf-form-row"><label>رقم العمارة<input name="building" maxLength={40} /></label><label>الدور / الشقة<input name="floor" maxLength={40} /></label></div>
          <label>علامة مميزة<input name="landmark" maxLength={180} /></label>
          <p className="cf-delivery-note">سيتم تأكيد رسوم التوصيل مع الفرع قبل تجهيز الطلب.</p>
        </div> : null}
        <label>ملاحظات إضافية<textarea name="notes" rows={3} maxLength={500} /></label>
        <div className="cf-payment-choice"><strong>طريقة الدفع</strong><span>الدفع نقدًا عند الاستلام / التوصيل</span></div>
        {error ? <p className="cf-form-error" role="alert">{error}</p> : null}
        <button className="cf-submit-order" type="submit" disabled={busy || !cart.length}>{busy ? "جارٍ تسجيل الطلب..." : "تأكيد الطلب"}</button>
        <small className="cf-privacy-note">لن يتم خصم أي مبلغ إلكتروني. الطلب يُرسل للفرع للتأكيد.</small>
      </form>
    </div>
  </main>;
}
