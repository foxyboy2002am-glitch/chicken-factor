import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const promotions = [
  {
    id: "friends-625",
    title: "عرض الصحاب",
    price: 625,
    image: "/offers/friends-625.webp",
    description: "11 قطعة دجاج + 6 خبز + كولسلو + ثومية + بطاطس",
  },
  {
    id: "rizo-150",
    title: "عرض الريزو",
    price: 150,
    image: "/offers/rizo-150.webp",
    description: "2 طبق ريزو",
  },
  {
    id: "control-199",
    title: "عرض السيطرة",
    price: 199,
    image: "/offers/control-199.webp",
    description: "1 تشيكن كلاسيك سنجل + 1 توستر رول سنجل",
  },
  {
    id: "mix-6-525",
    title: "عرض ميكس 6",
    price: 525,
    image: "/offers/mix-6-525.webp",
    description: "6 قطع دجاج + 6 قطع استربس + كولسلو + ثومية + بطاطس + 6 خبز",
  },
];

export default async function MenuPage() {
  let categories: any[] = [];
  let products: any[] = [];
  let variants: any[] = [];
  let queryError: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const [categoriesResult, productsResult, variantsResult] = await Promise.all([
      supabase.from("categories")
        .select("id, slug, name_ar, name_en, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("products")
        .select("id, sku, name_ar, name_en, description_ar, category_id, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("product_variants")
        .select("id, product_id, name_ar, name_en, base_price, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const error = categoriesResult.error ?? productsResult.error ?? variantsResult.error;
    if (error) {
      queryError = error.message;
      console.error("[Chicken Factor menu] Supabase query failed:", error.message, error.code);
    }
    categories = categoriesResult.data ?? [];
    products = productsResult.data ?? [];
    variants = variantsResult.data ?? [];
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
      })),
  })).filter((category) => category.products.length > 0);

  return (
    <main className="store-page">
      <header className="store-header">
        <a className="store-logo" href="/menu" aria-label="Chicken Factor - الصفحة الرئيسية">
          <img src="/profile_chicken_factor.webp" alt="Chicken Factor" />
          <b>CHICKEN FACTOR</b>
        </a>
        <a className="store-hotline" href="tel:15407">الخط الساخن <strong>15407</strong></a>
      </header>

      <section className="store-hero">
        <div className="store-hero-inner">
          <div className="store-hero-content">
            <p className="store-eyebrow">FRESH • CRISPY • DELICIOUS</p>
            <p className="store-farm-slogan">فراخنا من إنتاج مزارعنا</p>
            <h1>الطعم اللي <em>يلمّنا!</em></h1>
            <p className="store-hero-description">وجبات فراخ طازة، مقرمشة، وعروض تجمع كل اللي بتحبهم.</p>
            <div className="store-hero-actions">
              <a href="#offers" className="store-primary-link">اكتشف العروض <span>←</span></a>
              <a className="store-hero-call" href="tel:15407">اطلب دلوقتي <strong>15407</strong></a>
            </div>
          </div>
          <div className="store-hero-visual">
            <img className="store-hero-food" src="/offers/mix-6-525.webp" alt="وجبة تشيكن فاكتور" />
            <img className="store-hero-logo" src="/profile_chicken_factor.webp" alt="شعار تشيكن فاكتور" />
            <span className="store-hero-sticker">FRESH<br/>& CRISPY</span>
          </div>
        </div>
      </section>

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
                <a href="tel:15407">اطلب العرض <span>15407</span></a>
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
          <nav className="menu-category-nav" aria-label="أقسام المنيو">
            {grouped.map((category) => <a key={category.id} href={`#${category.id}`}>{category.name_ar}</a>)}
          </nav>
          <div className="store-menu">
            {grouped.map((category) => (
              <section className="store-category" id={category.id} key={category.id}>
                <div className="store-category-heading">
                  <div><span>{category.name_en}</span><h2>{category.name_ar}</h2></div>
                  <b>{category.products.length} صنف</b>
                </div>
                <div className="store-product-grid">
                  {category.products.map((product) => (
                    <article className="store-product" key={product.id}>
                      <div className="product-photo-wrap">
                        <img className="product-photo" src={categoryImages[category.slug] ?? "/offers/friends-625.webp"} alt={product.name_ar} loading="lazy" />
                        <span className="product-photo-badge">CHICKEN FACTOR</span>
                      </div>
                      <div className="store-product-body">
                        <div className="store-product-top"><span className="store-product-code">{product.sku}</span><span className="store-product-mark">CF</span></div>
                        <h3>{product.name_ar}</h3>
                        <p className="store-product-en">{product.name_en}</p>
                        {product.description_ar ? <p className="store-product-desc">{product.description_ar}</p> : null}
                        <div className="store-price-list">
                          {product.variants.map((variant) => (
                            <div className="store-price" key={variant.id}>
                              <span>{variant.name_ar}</span>
                              <strong>{Number(variant.base_price).toLocaleString("ar-EG")} <small>جنيه</small></strong>
                            </div>
                          ))}
                          {!product.variants.length ? <span className="store-product-desc">السعر غير متاح حالياً</span> : null}
                        </div>
                        <a className="product-order-link" href="tel:15407">اطلب الآن <span>15407</span></a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
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
