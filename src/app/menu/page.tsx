import { createSupabaseServerClient } from "@/lib/supabase/server";
import MenuBrowser from "@/components/menu-browser";
import CartButton from "@/components/cart-button";
import OfferAddToCartButton from "@/components/offer-add-to-cart-button";
import { promotions } from "@/lib/promotions";

export const revalidate = 60;

const categoryImages: Record<string, string> = {
  "individual-meals": "/offers/friends-625.webp",
  "family-meals": "/offers/mix-6-525.webp",
  "rice-meals": "/offers/rizo-150.webp",
  "drumstick-meals": "/offers/friends-625.webp",
  "strips-family": "/offers/mix-6-525.webp",
  sandwiches: "/offers/control-199.webp",
  "chicken-burgers": "/offers/control-199.webp",
  "beef-burgers": "/offers/control-199.webp",
  extras: "/offers/mix-6-525.webp",
  sauces: "/offers/friends-625.webp",
  drinks: "/offers/rizo-150.webp",
  "selected-pieces": "/offers/friends-625.webp",
  "wing-swaps": "/offers/friends-625.webp",
};

export default async function MenuPage() {
  let categories: any[] = [];
  let products: any[] = [];
  let variants: any[] = [];
  let activeOffers: any[] = [];
  let whatsappNumber = "";
  let queryError: string | null = null;

  const supabase = await createSupabaseServerClient();
  try {
    const now = new Date().toISOString();
    const [categoriesResult, productsResult, variantsResult, offersResult, offerBranchesResult, contactResult] = await Promise.all([
      supabase.from("categories")
        .select("id, slug, name_ar, name_en, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("products")
        .select("id, sku, name_ar, name_en, description_ar, image_path, category_id, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("product_variants")
        .select("id, product_id, name_ar, name_en, base_price, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("offers")
        .select("id, name_ar, name_en, description_ar, discount_type, discount_value, starts_at, ends_at")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("created_at", { ascending: false }),
      supabase.from("offer_branches").select("offer_id"),
      supabase.from("store_contact_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
    ]);

    const error = categoriesResult.error ?? productsResult.error ?? variantsResult.error ?? offersResult.error ?? offerBranchesResult.error ?? contactResult.error;
    if (error) {
      queryError = error.message;
      console.error("[Chicken Factor menu] Supabase query failed:", error.message, error.code);
    }
    categories = categoriesResult.data ?? [];
    products = productsResult.data ?? [];
    variants = variantsResult.data ?? [];
    const branchScopedOfferIds = new Set((offerBranchesResult.data ?? []).map((row) => row.offer_id));
    activeOffers = (offersResult.data ?? []).filter((offer) => !branchScopedOfferIds.has(offer.id));
    whatsappNumber = String(contactResult.data?.whatsapp_number ?? "").replace(/\D/g, "");
  } catch (error) {
    queryError = error instanceof Error ? error.message : "Unknown Supabase server error";
    console.error("[Chicken Factor menu] Supabase initialization failed:", error);
  }

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.product_id, current);
  }

  const grouped = categories.map((category) => ({
    ...category,
    products: products
      .filter((product) => product.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((product) => ({
        ...product,
        variants: variantsByProduct.get(product.id) ?? [],
        imageUrl: product.image_path ? supabase.storage.from("product-images").getPublicUrl(product.image_path).data.publicUrl : null,
      })),
  })).filter((category) => category.products.length > 0);

  return (
    <main className="store-page">
      <header className="store-header">
        <a className="store-logo" href="/menu" aria-label="Chicken Factor - الصفحة الرئيسية">
          <img src="/profile_chicken_factor.webp" alt="Chicken Factor" />
          <b>CHICKEN FACTOR</b>
        </a>
        <div className="store-header-actions"><CartButton /><a className="store-hotline" href="tel:15407">الخط الساخن <strong>15407</strong></a></div>
      </header>

      <section className="store-hero">
        <div className="store-hero-inner">
          <div className="store-hero-content">
            <span className="store-eyebrow">FRESH • CRISPY • DELICIOUS</span>
            <p className="store-farm-slogan">فراخنا من إنتاج مزارعنا</p>
            <h1>الطعم اللي <em>يلمّنا!</em></h1>
            <p className="store-hero-description">اختار وجبتك المفضلة من تشيكن فاكتور واستمتع بعروضنا.</p>
            <div className="store-hero-actions">
              <a href="#offers" className="store-primary-link">اكتشف العروض <span>←</span></a>
              <a className="store-hero-call" href="tel:15407">اطلب على <strong>15407</strong></a>
            </div>
          </div>
          <div className="store-hero-visual">
            <img className="store-hero-food" src="/offers/mix-6-525.webp" alt="وجبة تشيكن فاكتور" />
            <img className="store-hero-logo" src="/profile_chicken_factor.webp" alt="شعار تشيكن فاكتور" />
            <span className="store-hero-sticker">FRESH<br/>&amp; CRISPY</span>
          </div>
        </div>
      </section>

      {activeOffers.length > 0 ? (
        <section className="offers-section database-offers-section" aria-label="العروض السارية من الإدارة">
          <div className="offers-heading">
            <div><span>LIVE OFFERS</span><h2>عروض سارية الآن</h2></div>
          </div>
          <div className="offers-grid">
            {activeOffers.map((offer) => {
              const value = Number(offer.discount_value);
              const discountText = offer.discount_type === "percentage"
                ? `${value}% خصم`
                : offer.discount_type === "bundle_price"
                  ? `سعر الباقة ${value.toLocaleString("ar-EG")} جنيه`
                  : `${value.toLocaleString("ar-EG")} جنيه خصم`;
              return (
                <article className="offer-card database-offer-card" key={offer.id}>
                  <div className="offer-card-content">
                    <div className="offer-title-row">
                      <h3>{offer.name_ar}</h3>
                      <strong>{discountText}</strong>
                    </div>
                    {offer.description_ar ? <p>{offer.description_ar}</p> : null}
                    <small>ساري حتى {new Date(offer.ends_at).toLocaleString("ar-EG")}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="offers-section" id="offers">
        <div className="offers-heading">
          <div><span>HOT DEALS</span><h2>عروض تشيكن فاكتور</h2></div>
          <a href="tel:15407">اطلب الآن <strong>15407</strong></a>
        </div>
        <div className="offers-grid">
          {promotions.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <img src={offer.image} alt={offer.title} loading="lazy" />
              <div className="offer-card-content">
                <div className="offer-title-row">
                  <h3>{offer.title}</h3>
                  <strong>{offer.price} <small>جنيه</small></strong>
                </div>
                <p>{offer.description}</p>
                <OfferAddToCartButton offerId={offer.id} offerName={offer.title} price={offer.price} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {queryError ? (
        <p className="store-error">العروض متاحة حالياً، لكن المنيو غير متصل بقاعدة البيانات. راجع إعدادات Supabase في Vercel.</p>
      ) : grouped.length === 0 ? (
        <p className="store-error">المنيو بيتجهز حالياً، حاول مرة أخرى بعد قليل.</p>
      ) : (
        <>
          <div className="menu-section-intro" id="menu-categories">
            <span>OUR MENU</span>
            <h2>المنيو الكامل</h2>
            <p>اختار القسم وشوف المنتجات والأسعار.</p>
          </div>
          <MenuBrowser categories={grouped} whatsappNumber={whatsappNumber} />
        </>
      )}
      <footer className="store-footer">
        <img src="/profile_chicken_factor.webp" alt="" />
        <b>CHICKEN FACTOR</b><span>فراخنا من إنتاج مزارعنا</span><span>للطلب والاستفسار</span><a href="tel:15407">15407</a>
        <small>الأسعار بالجنيه المصري. يرجى التأكد من توافر العرض في الفرع قبل الطلب.</small>
        <div className="store-copyright" dir="ltr">© 2026 Wonder Tech. All rights reserved.</div>
      </footer>
    </main>
  );
}
