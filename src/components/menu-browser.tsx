"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "@/components/add-to-cart-button";

type Variant = { id: string; name_ar: string; name_en?: string | null; base_price: number | string; sort_order?: number };
type Product = { id: string; sku?: string | null; name_ar: string; name_en?: string | null; description_ar?: string | null; imageUrl?: string | null; variants: Variant[] };
type Category = { id: string; slug: string; name_ar: string; name_en?: string | null; products: Product[] };

export default function MenuBrowser({ categories, whatsappNumber }: { categories: Category[]; whatsappNumber: string }) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const active = categories.find((category) => category.id === activeId) ?? categories[0];
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ar");
    if (!term) return active?.products ?? [];
    return (active?.products ?? []).filter((product) =>
      [product.name_ar, product.name_en, product.sku, product.description_ar].some((value) => String(value ?? "").toLocaleLowerCase("ar").includes(term))
    );
  }, [active, query]);

  if (!active) return null;

  return (
    <section className="cf-menu-browser" aria-label="قائمة الطعام">
      <div className="cf-menu-toolbar">
        <div><span className="cf-menu-kicker">CHOOSE YOUR FAVORITE</span><h2>اختار وجبتك</h2><p>اضغط على القسم لعرض أصنافه فقط</p></div>
        <label className="cf-menu-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في القسم الحالي..." aria-label="ابحث في المنتجات" /></label>
      </div>
      <nav className="cf-category-tabs" aria-label="أقسام المنيو">
        {categories.map((category, index) => (
          <button type="button" key={category.id} className={category.id === activeId ? "is-active" : ""} onClick={() => { setActiveId(category.id); setQuery(""); }}>
            <span className="cf-tab-number">{String(index + 1).padStart(2, "0")}</span>{category.name_ar}<small>{category.products.length}</small>
          </button>
        ))}
      </nav>
      <div className="cf-active-category" key={active.id}>
        <div className="cf-active-heading"><div><span>{active.name_en || "CHICKEN FACTOR MENU"}</span><h3>{active.name_ar}</h3></div><b>{visibleProducts.length} صنف</b></div>
        {visibleProducts.length ? <div className="cf-product-grid">
          {visibleProducts.map((product, index) => (
            <article className="cf-product-card" key={product.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
              <div className="cf-product-visual">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name_ar} loading="lazy" /> : <div className="cf-product-art"><span className="cf-product-spark">✦</span><span className="cf-product-art-brand">CHICKEN FACTOR</span><strong>{product.name_ar}</strong><span className="cf-product-art-icon">🍗</span></div>}
                <span className="cf-product-fresh">FRESH • CRISPY</span>
              </div>
              <div className="cf-product-content">
                <div className="cf-product-meta"><span>{product.sku || "CHICKEN FACTOR"}</span><span>طازج يومياً</span></div>
                <h4>{product.name_ar}</h4>
                {product.name_en ? <p className="cf-product-en">{product.name_en}</p> : null}
                {product.description_ar ? <p className="cf-product-description">{product.description_ar}</p> : null}
                <div className="cf-variant-list">
                  {product.variants.map((variant) => {
                    const price = Number(variant.base_price);
                    return <div className="cf-variant-row" key={variant.id}>
                      <div><span>{variant.name_ar}</span><strong>{price.toLocaleString("ar-EG")} <small>جنيه</small></strong></div>
                      <AddToCartButton productId={product.id} variantId={variant.id} productName={product.name_ar} variantName={variant.name_ar} price={price} sku={product.sku} />
                    </div>;
                  })}
                  {!product.variants.length ? <p className="cf-unavailable">السعر غير متاح حالياً</p> : null}
                </div>
                {whatsappNumber ? <a className="cf-product-whatsapp" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`مرحباً، أريد الاستفسار عن ${product.name_ar}`)}`} target="_blank" rel="noopener noreferrer">استفسر عن المنتج عبر واتساب</a> : null}
              </div>
            </article>
          ))}
        </div> : <div className="cf-no-products">مفيش منتجات مطابقة للبحث في القسم ده.</div>}
      </div>
    </section>
  );
}
