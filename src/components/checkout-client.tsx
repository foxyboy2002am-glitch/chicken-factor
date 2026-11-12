"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Branch = { id: string; name_ar: string; accepts_delivery: boolean; accepts_pickup: boolean };
type CartItem = { productId?: string; variantId?: string; offerId?: string; productName: string; variantName: string; price: number; quantity: number };
type Coordinates = { latitude: number; longitude: number };
type ReverseAddress = { suburb?: string; neighbourhood?: string; village?: string; town?: string; city_district?: string; city?: string; county?: string; state?: string; road?: string; pedestrian?: string; residential?: string; house_number?: string };
const cartLineKey = (item: CartItem) => item.offerId ? `offer:${item.offerId}` : `variant:${item.variantId || item.productId || item.productName}`;
const CART_KEY = "cf-store-cart-v1";
const money = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);

export default function CheckoutClient({ branches }: { branches: Branch[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [governorate, setGovernorate] = useState("");
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

  function fillIfEmpty(name: string, value?: string) {
    const input = formRef.current?.elements.namedItem(name);
    if (input instanceof HTMLInputElement && !input.value.trim() && value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("المتصفح لا يدعم تحديد الموقع. اكتب عنوانك يدويًا.");
      return;
    }
    setLocating(true);
    setLocationStatus("بنحدد موقعك… وافق على طلب الموقع من المتصفح.");
    navigator.geolocation.getCurrentPosition(async (result) => {
      const coords = { latitude: result.coords.latitude, longitude: result.coords.longitude };
      setPosition(coords);
      setLocationStatus("تم تحديد موقعك. بنحاول نقرأ العنوان القريب…");
      try {
        const query = new URLSearchParams({ format: "jsonv2", lat: String(coords.latitude), lon: String(coords.longitude), zoom: "18", addressdetails: "1", "accept-language": "ar" });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("reverse geocoding unavailable");
        const result = await response.json() as { display_name?: string; address?: ReverseAddress };
        const address = result.address ?? {};
        const area = address.suburb || address.neighbourhood || address.village || address.town || address.city_district || address.city || address.county;
        const street = address.road || address.pedestrian || address.residential;
        fillIfEmpty("area", area);
        fillIfEmpty("street", street);
        fillIfEmpty("building", address.house_number);
        setGovernorate(address.state || address.county || "");
        setFormattedAddress(result.display_name || "");
        setLocationStatus("اتحدد موقعك واتقرأ العنوان التقريبي. راجع البيانات وكمل الناقص.");
      } catch {
        setLocationStatus("تم تحديد النقطة على الخريطة، لكن تعذر قراءة العنوان تلقائيًا. اكتب المنطقة والشارع يدويًا.");
      } finally {
        setLocating(false);
      }
    }, (geoError) => {
      setLocating(false);
      const message = geoError.code === geoError.PERMISSION_DENIED
        ? "إذن الموقع مرفوض. فعّله من إعدادات المتصفح أو اكتب العنوان يدويًا."
        : geoError.code === geoError.TIMEOUT
          ? "تحديد الموقع أخذ وقتًا طويلًا. حاول مرة أخرى."
          : "تعذر تحديد الموقع حاليًا. اكتب العنوان يدويًا.";
      setLocationStatus(message);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  const mapSrc = position
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${position.longitude - 0.012}%2C${position.latitude - 0.008}%2C${position.longitude + 0.012}%2C${position.latitude + 0.008}&layer=mapnik&marker=${position.latitude}%2C${position.longitude}`
    : null;

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
        governorate,
        formattedAddress,
        latitude: position?.latitude,
        longitude: position?.longitude,
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
        <h2>ملخص طلبك</h2>
        {!cart.length ? <p className="cf-empty-cart">السلة فارغة. <a href="/menu">اختار منتجات من المنيو</a>.</p> : cart.map(item => <div className="cf-cart-line" key={cartLineKey(item)}>
          <div><strong>{item.productName}</strong><small>{item.offerId ? "عرض كامل" : item.variantName} · {money(item.price)} جنيه</small></div>
          <div className="cf-quantity"><button type="button" onClick={() => updateQuantity(cartLineKey(item), item.quantity - 1)} aria-label="تقليل الكمية">−</button><b>{item.quantity}</b><button type="button" onClick={() => updateQuantity(cartLineKey(item), Math.min(20, item.quantity + 1))} aria-label="زيادة الكمية">+</button></div>
          <strong>{money(item.price * item.quantity)} ج</strong>
        </div>)}
        <div className="cf-total-line"><span>الإجمالي المبدئي</span><strong>{money(total)} جنيه</strong></div>
        <div className="cf-checkout-assurance"><span>✓</span><div><strong>طلبك بأمان</strong><small>السعر النهائي ورسوم التوصيل يتم تأكيدهم مع الفرع.</small></div></div>
      </section>
      <form ref={formRef} className="cf-checkout-card cf-checkout-form" onSubmit={submit}>
        <h2>بيانات العميل والاستلام</h2>
        <label>الاسم بالكامل<input name="customerName" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>رقم الموبايل<input name="customerPhone" required type="tel" inputMode="tel" minLength={10} maxLength={20} autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
        <label>طريقة الاستلام<select value={fulfillment} onChange={e => setFulfillment(e.target.value as "delivery" | "pickup")}><option value="delivery">توصيل للعنوان</option><option value="pickup">استلام من الفرع</option></select></label>
        <label>الفرع<select value={branchId} onChange={e => setBranchId(e.target.value)} required><option value="">اختار الفرع</option>{eligibleBranches.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></label>
        {fulfillment === "delivery" ? <div className="cf-address-fields">
          <div className="cf-location-heading"><div><strong>عنوان التوصيل</strong><small>حدد موقعك لتسهيل وصول الطلب</small></div><button type="button" onClick={detectLocation} disabled={locating}>{locating ? "جارٍ التحديد…" : "⌖ حدد موقعي تلقائيًا"}</button></div>
          {locationStatus ? <p className="cf-location-status" role="status">{locationStatus}</p> : null}
          {mapSrc ? <div className="cf-location-map"><iframe title="موقع التوصيل على الخريطة" src={mapSrc} loading="lazy" referrerPolicy="no-referrer" /><div className="cf-map-caption"><span>📍 موقعك المحدد</span><a href={`https://www.google.com/maps?q=${position?.latitude},${position?.longitude}`} target="_blank" rel="noreferrer">فتح في خرائط Google ↗</a></div></div> : <div className="cf-map-placeholder"><span>⌖</span><strong>الخريطة هتظهر هنا</strong><small>اضغط «حدد موقعي تلقائيًا» واسمح للمتصفح بالوصول للموقع.</small></div>}
          {formattedAddress ? <p className="cf-detected-address">العنوان المقروء: {formattedAddress}</p> : null}
          <label>المنطقة / الحي<input name="area" required maxLength={120} /></label>
          <label>الشارع<input name="street" required maxLength={180} /></label>
          <div className="cf-form-row"><label>رقم العمارة<input name="building" maxLength={40} /></label><label>الدور / الشقة<input name="floor" maxLength={40} /></label></div>
          <label>علامة مميزة<input name="landmark" maxLength={180} /></label>
          <p className="cf-delivery-note">حدد موقعك اختياريًا، وتقدر تعدّل العنوان يدويًا. اختيار الفرع الحالي محفوظ كما هو.</p>
        </div> : null}
        <label>ملاحظات إضافية<textarea name="notes" rows={3} maxLength={500} /></label>
        <div className="cf-payment-choice"><strong>طريقة الدفع</strong><span>الدفع نقدًا عند الاستلام / التوصيل</span></div>
        {error ? <p className="cf-form-error" role="alert">{error}</p> : null}
        <button className="cf-submit-order" type="submit" disabled={busy || !cart.length}>{busy ? "جارٍ تسجيل الطلب..." : "تأكيد الطلب"}</button>
        <small className="cf-privacy-note">لن يتم تحديد موقعك إلا بعد الضغط على الزر والسماح من المتصفح. لا يتم حفظه في ملف شخصي؛ يُرفق بعنوان هذا الطلب فقط.</small>
      </form>
    </div>
  </main>;
}
