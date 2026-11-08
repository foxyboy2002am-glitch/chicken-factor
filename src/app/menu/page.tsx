import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function MenuPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch each table independently. This avoids PostgREST embedded-relation
  // lookup failures while keeping the same public RLS-protected reads.
  const [categoriesResult, productsResult, variantsResult] = await Promise.all([
    supabase.from("categories")
      .select("id, name_ar, name_en, sort_order")
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

  const queryError = categoriesResult.error ?? productsResult.error ?? variantsResult.error;
  if (queryError) {
    console.error("[Chicken Factor menu] Supabase query failed:", queryError.message, queryError.code);
  }

  const categories = categoriesResult.data ?? [];
  const products = productsResult.data ?? [];
  const variants = variantsResult.data ?? [];

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
        <a className="store-logo" href="/menu"><span>CF</span><b>CHICKEN FACTOR</b></a>
        <a className="store-hotline" href="tel:15407">الخط الساخن <strong>15407</strong></a>
      </header>
      <section className="store-hero">
        <p className="store-eyebrow">FRESH • CRISPY • DELICIOUS</p>
        <h1>منيو تشيكن فاكتور</h1>
        <p>اختار وجبتك المفضلة وشوف الأحجام والأسعار.</p>
        <a href="#menu-categories" className="store-primary-link">استكشف المنيو</a>
      </section>
      {queryError ? (
        <p className="store-error">حصلت مشكلة في الاتصال بالمنيو. حاول مرة أخرى بعد قليل.</p>
      ) : grouped.length === 0 ? (
        <p className="store-error">المنيو بيتجهز حالياً، حاول مرة أخرى بعد قليل.</p>
      ) : (
        <>
          <nav id="menu-categories" className="menu-category-nav" aria-label="أقسام المنيو">
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
                      <div className="store-product-top"><span className="store-product-mark">CF</span><span className="store-product-code">{product.sku}</span></div>
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
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <footer className="store-footer"><b>CHICKEN FACTOR</b><span>للطلب والاستفسار</span><a href="tel:15407">15407</a><small>الأسعار بالجنيه المصري وقد تختلف حسب الفرع.</small></footer>
    </main>
  );
}
