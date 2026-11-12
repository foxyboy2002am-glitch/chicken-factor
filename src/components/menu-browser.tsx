"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "@/components/add-to-cart-button";
import { useStoreLanguage } from "@/components/store-language";

type Variant = { id: string; name_ar: string; name_en?: string | null; base_price: number | string; sort_order?: number };
type Product = { id: string; sku?: string | null; name_ar: string; name_en?: string | null; description_ar?: string | null; imageUrl?: string | null; variants: Variant[] };
type Category = { id: string; slug: string; name_ar: string; name_en?: string | null; products: Product[] };

export default function MenuBrowser({ categories }: { categories: Category[] }) {
  const { language } = useStoreLanguage();\n  const en = language === "en";\n  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
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
    <section className="cf-menu-browser" aria-label={en ? "Food menu" : "قائمة الطعام"}>
      <div className="cf-menu-toolbar">
        <div><span className="cf-menu-kicker">CHOOSE YOUR FAVORITE</span><h2>{en ? "Choose your meal" : "اختار وجبتك"}</h2><p>{en ? "Select a category to browse its items" : "اضغط على القسم لعرض أصنافه فقط"}</p></div>
        <label className="cf-menu-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? "Search this category..." : "ابحث في القسم الحالي..."} aria-label={en ? "Search products" : "ابحث في المنتجات"} /></label>
      </div>
      <nav className="cf-category-tabs" aria-label={en ? "Menu categories" : "أقسام المنيو"}>
        {categories.map((category, index) => (
          <button type="button" key={category.id} className={category.id === activeId ? "is-active" : ""} onClick={() => { setActiveId(category.id); setQuery(""); }}>
            <span className="cf-tab-number">{String(index + 1).padStart(2, "0")}</span>{en ? (category.name_en || category.name_ar) : category.name_ar}<small>{category.products.length}</small>
          </button>
        ))}
      </nav>
      <div className="cf-active-category" key={active.id}>
        <div className="cf-active-heading"><div><span>{active.name_en || "CHICKEN FACTOR MENU"}</span><h3>{en ? (active.name_en || active.name_ar) : active.name_ar}</h3></div><b>{visibleProducts.length} {en ? "items" : "صنف"}</b></div>
        {visibleProducts.length ? <div className="cf-product-grid">
          {visibleProducts.map((product, index) => (
            <article className="cf-product-card" key={product.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
              <div className="cf-product-visual">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name_ar} loading="lazy" /> : <div className="cf-product-art"><span className="cf-product-spark">✦</span><span className="cf-product-art-brand">CHICKEN FACTOR</span><strong>{product.name_ar}</strong><span className="cf-product-art-icon">🍗</span></div>}
                <span className="cf-product-fresh">FRESH • CRISPY</span>
              </div>
              <div className="cf-product-content">
                <div className="cf-product-meta"><span>{product.sku || "CHICKEN FACTOR"}</span><span>{en ? "Fresh daily" : "طازج يومياً"}</span></div>
                <h4>{en ? (product.name_en || product.name_ar) : product.name_ar}</h4>
                {product.name_en ? <p className="cf-product-en">{product.name_en}</p> : null}
                {product.description_ar ? <p className="cf-product-description">{product.description_ar}</p> : null}
                <div className="cf-variant-list">
                  {product.variants.map((variant) => {
                    const price = Number(variant.base_price);
                    return <div className="cf-variant-row" key={variant.id}>
                      <div><span>{en ? (variant.name_en || variant.name_ar) : variant.name_ar}</span><strong>{price.toLocaleString("ar-EG")} <small>{en ? "EGP" : "جنيه"}</small></strong></div>
                      <AddToCartButton productId={product.id} variantId={variant.id} productName={product.name_ar} variantName={variant.name_ar} price={price} sku={product.sku} />
                    </div>;
                  })}
                  {!product.variants.length ? <p className="cf-unavailable">{en ? "Price currently unavailable" : "السعر غير متاح حالياً"}</p> : null}
                </div>
              </div>
            </article>
          ))}
        </div> : <div className="cf-no-products">{en ? "No products match your search in this category." : "مفيش منتجات مطابقة للبحث في القسم ده."}</div>}
      </div>
    </section>
  );
}
