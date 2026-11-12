import { createSupabaseServerClient } from "@/lib/supabase/server";
import MenuBrowser from "@/components/menu-browser";
import CartButton from "@/components/cart-button";
import OffersCarousel from "@/components/offers-carousel";
import { StoreLanguageProvider, LanguageSwitcher } from "@/components/store-language";
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
        imageUrl: product.image_path ? (product.image_path.startsWith("http") ? product.image_path : supabase.storage.from("product-images").getPublicUrl(product.image_path).data.publicUrl) : null,
      })),
  })).filter((category) => category.products.length > 0);

  return (
    <StoreLanguageProvider><main className="store-page">
      <header className="store-header">
        <a className="store-logo" href="/menu" aria-label="Chicken Factor - الصفحة الرئيسية">
          <img src="/profile_chicken_factor.webp" alt="Chicken Factor" />
          <b>CHICKEN FACTOR</b>
        </a>
        <nav className="store-main-nav" aria-label="التنقل الرئيسي">
          <a href="#menu-categories" data-ar="المنيو" data-en="Menu">المنيو</a>
          <a href="#offers" data-ar="العروض" data-en="Offers">العروض</a>
          <a href="#branches" data-ar="الفروع" data-en="Branches">الفروع</a>
        </nav>
        <div className="store-header-actions"><LanguageSwitcher /><CartButton /><a className="store-hotline" href="tel:15407"><span data-ar="الخط الساخن" data-en="Hotline">الخط الساخن</span> <strong>15407</strong></a></div>
      </header>

      <section className="store-hero">
        <div className="store-hero-inner">
          <div className="store-hero-content">
            <span className="store-eyebrow">FRESH • CRISPY • DELICIOUS</span>
            <p className="store-farm-slogan" data-ar="فراخنا من إنتاج مزارعنا" data-en="Our chicken comes from our own farms">فراخنا من إنتاج مزارعنا</p>
            <h1><span data-ar="الطعم اللي" data-en="The taste that">الطعم اللي</span> <em data-ar="يلمّنا!" data-en="brings us together!">يلمّنا!</em></h1>
            <p className="store-hero-description" data-ar="اختار وجبتك المفضلة من تشيكن فاكتور واستمتع بعروضنا." data-en="Choose your favorite Chicken Factor meal and enjoy our offers.">اختار وجبتك المفضلة من تشيكن فاكتور واستمتع بعروضنا.</p>
            <div className="store-hero-actions">
              <a href="#offers" className="store-primary-link"><span data-ar="اكتشف العروض" data-en="Explore offers">اكتشف العروض</span> <span>←</span></a>
              <a className="store-hero-call" href="tel:15407"><span data-ar="اطلب على" data-en="Call to order">اطلب على</span> <strong>15407</strong></a>
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
            <div><span>LIVE OFFERS</span><h2 data-ar="عروض سارية الآن" data-en="Current offers">عروض سارية الآن</h2></div>
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
                      <h3 data-ar={offer.name_ar} data-en={offer.name_en || offer.name_ar}>{offer.name_ar}</h3>
                      <strong>{discountText}</strong>
                    </div>
                    {offer.description_ar ? <p>{offer.description_ar}</p> : null}
                    <small><span data-ar="ساري حتى" data-en="Valid until">ساري حتى</span> {new Date(offer.ends_at).toLocaleString("ar-EG")}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="offers-section" id="offers">
        <div className="offers-heading">
          <div><span>HOT DEALS</span><h2 data-ar="عروض تشيكن فاكتور" data-en="Chicken Factor offers">عروض تشيكن فاكتور</h2></div>
          <a href="tel:15407"><span data-ar="اطلب الآن" data-en="Order now">اطلب الآن</span> <strong>15407</strong></a>
        </div>
        <OffersCarousel offers={promotions} />
      </section>

      {queryError ? (
        <p className="store-error" data-ar="العروض متاحة حالياً، لكن المنيو غير متصل بقاعدة البيانات. راجع إعدادات Supabase في Vercel." data-en="Offers are available, but the menu is not connected to the database. Check the Supabase settings in Vercel.">العروض متاحة حالياً، لكن المنيو غير متصل بقاعدة البيانات. راجع إعدادات Supabase في Vercel.</p>
      ) : grouped.length === 0 ? (
        <p className="store-error" data-ar="المنيو بيتجهز حالياً، حاول مرة أخرى بعد قليل." data-en="The menu is being prepared. Please try again shortly.">المنيو بيتجهز حالياً، حاول مرة أخرى بعد قليل.</p>
      ) : (
        <>
          <div className="menu-section-intro" id="menu-categories">
            <span>OUR MENU</span>
            <h2 data-ar="المنيو الكامل" data-en="Full menu">المنيو الكامل</h2>
            <p data-ar="اختار القسم وشوف المنتجات والأسعار." data-en="Choose a category to explore meals and prices.">اختار القسم وشوف المنتجات والأسعار.</p>
          </div>
          <MenuBrowser categories={grouped} />
        </>
      )}
      <section className="store-branches" id="branches" aria-labelledby="branches-title">
        <div className="store-branches-heading">
          <span>OUR LOCATIONS</span>
          <h2 id="branches-title" data-ar="فروع تشيكن فاكتور" data-en="Chicken Factor branches">فروع تشيكن فاكتور</h2>
          <p data-ar="تشيكن فاكتور معاك في كل مكان" data-en="Chicken Factor is always close to you">تشيكن فاكتور معاك في كل مكان</p>
        </div>
        <div className="store-branches-grid">
          <article className="store-branch-card"><h3>الإسماعيلية</h3><span className="store-branch-soon">قريباً</span></article>
          <article className="store-branch-card"><h3>العباسية</h3><span className="store-branch-soon">قريباً</span></article>
          <article className="store-branch-card"><h3>أبو كبير</h3><a href="https://maps.app.goo.gl/kubTMsSUQrSa8pNQA" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>العاشر من رمضان</h3><a href="https://maps.app.goo.gl/tzjKc45c3qbrxGTo7?g_st=awb" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>طنطا</h3><a href="https://maps.app.goo.gl/3wo1B9gJC95jK6bZ7?g_st=awb" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>السنبلاوين</h3><a href="https://maps.app.goo.gl/e3bzMJ2b2341skrE9?g_st=aw" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>الزقازيق</h3><a href="https://maps.app.goo.gl/KpgKMuYe2wP5f9Q87" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>أبو حماد</h3><a href="tel:15407">للعنوان اتصل 15407</a></article>
          <article className="store-branch-card"><h3>منيا القمح</h3><a href="https://maps.app.goo.gl/ySWdsBumYdzCfZoK7" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>بلبيس</h3><a href="https://maps.app.goo.gl/4FpuVtTiRW5mQ9nQ7" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>ديرب نجم</h3><a href="https://maps.app.goo.gl/RPTMf2KZERwvCzTaA" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>ههيا</h3><a href="https://maps.app.goo.gl/75e6UynKQdzmdq7G7" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
          <article className="store-branch-card"><h3>التل الكبير</h3><a href="tel:15407">للعنوان اتصل 15407</a></article>
          <article className="store-branch-card"><h3>القرين</h3><a href="https://maps.app.goo.gl/6BUch4TPtHiSngo6A" target="_blank" rel="noopener noreferrer">افتح على الخريطة ↗</a></article>
        </div>
      </section>

      <footer className="store-footer">
        <img src="/profile_chicken_factor.webp" alt="" />
        <b>CHICKEN FACTOR</b><span data-ar="فراخنا من إنتاج مزارعنا" data-en="Our chicken comes from our own farms">فراخنا من إنتاج مزارعنا</span><span data-ar="للطلب والاستفسار" data-en="For orders and enquiries">للطلب والاستفسار</span><a href="tel:15407">15407</a>
        <small data-ar="الأسعار بالجنيه المصري. يرجى التأكد من توافر العرض في الفرع قبل الطلب." data-en="Prices are in Egyptian pounds. Please confirm offer availability with the branch before ordering.">الأسعار بالجنيه المصري. يرجى التأكد من توافر العرض في الفرع قبل الطلب.</small>
        <nav className="store-social-links" aria-label="تابع تشيكن فاكتور">
          <span data-ar="تابعنا على" data-en="Follow us">تابعنا على</span>
          <a href="https://www.facebook.com/Chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.6V13h2.7v8h3.2Z"/></svg>
          </a>
          <a href="https://www.instagram.com/chickennfactor/?hl=ar" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.7" r=".9" className="social-icon-fill"/></svg>
          </a>
          <a href="https://www.tiktok.com/tag/chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h3c.2 1.8 1.2 3.1 3 3.7v3.1a8 8 0 0 1-3-1v5.7a6.2 6.2 0 1 1-6.2-6.2c.4 0 .8 0 1.2.1v3.2a3.1 3.1 0 1 0 1.9 2.9V3Z"/></svg>
          </a>
        </nav>
        <div className="store-copyright" dir="ltr">© 2026 Wonder Tech. All rights reserved.</div>
      </footer>
    </main></StoreLanguageProvider>
  );
}
