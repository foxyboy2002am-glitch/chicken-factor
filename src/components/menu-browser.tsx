"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "@/components/add-to-cart-button";
import { useStoreLanguage } from "@/components/store-language";

type Variant = { id: string; name_ar: string; name_en?: string | null; base_price: number | string; sort_order?: number };
type Product = { id: string; sku?: string | null; name_ar: string; name_en?: string | null; description_ar?: string | null; imageUrl?: string | null; variants: Variant[] };
type Category = { id: string; slug: string; name_ar: string; name_en?: string | null; products: Product[] };

const categoryNamesEn: Record<string, string> = {
  "individual-meals": "Individual Meals", "family-meals": "Family Meals",
  "rice-meals": "Rice Meals", "drumstick-meals": "Drumstick Meals",
  "strips-family": "Family Strips", sandwiches: "Sandwiches",
  "chicken-burgers": "Chicken Burger Sandwiches", "beef-burgers": "Beef Burger Sandwiches",
  extras: "Extras", sauces: "Sauces", drinks: "Drinks",
  "selected-pieces": "Selected Pieces", "wing-swaps": "Wing Swaps",
};
const categoryEmojis: Record<string, string> = {
  "individual-meals":"🍗","family-meals":"👨‍👩‍👧‍👦","rice-meals":"🍚",
  "drumstick-meals":"🍖","strips-family":"🍟",sandwiches:"🥪",
  "chicken-burgers":"🍔","beef-burgers":"🥩",extras:"🧀",sauces:"🥫",
  drinks:"🥤","selected-pieces":"🍗","wing-swaps":"🍗",
};
const categoryName = (category: Category, en: boolean) =>
  en ? (category.name_en || categoryNamesEn[category.slug] || category.name_ar) : category.name_ar;

export default function MenuBrowser({ categories }: { categories: Category[] }) {
  const { language } = useStoreLanguage();
  const en = language === "en";
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
    <section className="cf-menu-browser" aria-label={en ? "Food menu" : "قائمة الطعام"}>
      <div className="cf-menu-toolbar">
        <div>
          <span className="cf-menu-kicker">{en ? "OUR MENU" : "منيو تشيكن فاكتور"}</span>
          <h2>{en ? "Pick your favorite meal" : "اختار وجبتك المفضلة"}</h2>
          <p>{en ? "Choose a category to explore the menu" : "اختار القسم اللي نفسك فيه وشوف أصنافه"}</p>
        </div>
        <label className="cf-menu-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? "Search the menu" : "ابحث في المنيو"} aria-label={en ? "Search products" : "ابحث في المنتجات"} /></label>
      </div>
      <nav className="cf-category-tabs" aria-label={en ? "Menu categories" : "أقسام المنيو"}>
        {categories.map((category) => (
          <button type="button" key={category.id} className={category.id === activeId ? "is-active" : ""} onClick={() => { setActiveId(category.id); setQuery(""); }}>
            <span>{categoryEmojis[category.slug] || "🍽️"} {categoryName(category, en)}</span><small>{category.products.length}</small>
          </button>
        ))}
      </nav>
      <div className="cf-active-category" key={active.id}>
        <div className="cf-active-heading"><div><span>{active.name_en || "CHICKEN FACTOR MENU"}</span><h3>{categoryEmojis[active.slug] || "🍽️"} {categoryName(active, en)}</h3></div><b>{visibleProducts.length} {en ? "items" : "صنف"}</b></div>
        {visibleProducts.length ? <div className="cf-product-grid">
          {visibleProducts.map((product, index) => (
            <article className="cf-product-card" key={product.id} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
              <div className="cf-product-visual">
                {product.imageUrl ? <img src={product.imageUrl} alt={en ? (product.name_en || product.name_ar) : product.name_ar} loading="lazy" /> : <div className="cf-product-art"><span className="cf-product-spark">✦</span><span className="cf-product-art-brand">CHICKEN FACTOR</span><strong>{en ? (product.name_en || product.name_ar) : product.name_ar}</strong><span className="cf-product-art-icon">🍗</span></div>}
                
              </div>
              <div className="cf-product-content">
                                <h4>{en ? (product.name_en || product.name_ar) : product.name_ar}</h4>
                {!en && product.name_en ? <p className="cf-product-en">{product.name_en}</p> : null}
                {product.description_ar ? <p className="cf-product-description">{product.description_ar}</p> : null}
                <div className="cf-variant-list">
                  {product.variants.map((variant) => {
                    const price = Number(variant.base_price);
                    return <div className="cf-variant-row" key={variant.id}>
                      <div><span>{en ? (variant.name_en || variant.name_ar) : variant.name_ar}</span><strong>{price.toLocaleString(en ? "en-EG" : "ar-EG")} <small>{en ? "EGP" : "جنيه"}</small></strong></div>
                      <AddToCartButton productId={product.id} variantId={variant.id} productName={en ? (product.name_en || product.name_ar) : product.name_ar} variantName={en ? (variant.name_en || variant.name_ar) : variant.name_ar} nameAr={product.name_ar} nameEn={product.name_en || product.name_ar} variantAr={variant.name_ar} variantEn={variant.name_en || variant.name_ar} price={price} sku={product.sku} />
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
