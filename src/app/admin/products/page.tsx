import { createCategory, createProduct } from "@/app/actions/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name_ar, name_en").order("name_ar"),
    supabase.from("products")
      .select("id, name_ar, name_en, sku, is_active, category_id, product_variants(name_ar, base_price)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="dashboard-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MENU MANAGEMENT</p>
          <h1>المنتجات والمنيو</h1>
          <p className="muted">إدارة التصنيفات والمنتجات والأسعار الأساسية.</p>
        </div>
      </div>

      {params.success ? <p className="notice success">تم الحفظ بنجاح.</p> : null}
      {params.error ? <p className="notice error">تعذر الحفظ. راجع البيانات وتأكد من صلاحيات قاعدة البيانات.</p> : null}

      <section className="content-card">
        <h2>إضافة تصنيف</h2>
        <form action={createCategory} className="data-form compact">
          <label>الاسم بالعربي<input name="name_ar" required /></label>
          <label>الاسم بالإنجليزي<input name="name_en" required /></label>
          <label>Slug بالإنجليزي<input name="slug" placeholder="fried-chicken" required /></label>
          <button type="submit">إضافة التصنيف</button>
        </form>
      </section>

      <section className="content-card">
        <h2>إضافة منتج</h2>
        <form action={createProduct} className="data-form">
          <label>اسم المنتج بالعربي<input name="name_ar" required /></label>
          <label>اسم المنتج بالإنجليزي<input name="name_en" required /></label>
          <label>
            التصنيف
            <select name="category_id" defaultValue="">
              <option value="">بدون تصنيف</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar} / {category.name_en}
                </option>
              ))}
            </select>
          </label>
          <label>SKU<input name="sku" /></label>
          <label>وصف بالعربي<textarea name="description_ar" rows={2} /></label>
          <label>وصف بالإنجليزي<textarea name="description_en" rows={2} /></label>
          <div className="form-divider">الحجم والسعر الأولي</div>
          <label>اسم الحجم بالعربي<input name="variant_name_ar" placeholder="وجبة فردية" required /></label>
          <label>اسم الحجم بالإنجليزي<input name="variant_name_en" placeholder="Single Meal" required /></label>
          <label>السعر بالجنيه<input name="price" type="number" min="0" step="0.01" required /></label>
          <button type="submit">حفظ المنتج</button>
        </form>
      </section>

      <section className="content-card">
        <h2>المنتجات المسجلة <span className="count">{products?.length ?? 0}</span></h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>المنتج</th><th>SKU</th><th>السعر المبدئي</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {products?.map((product) => {
                const variant = Array.isArray(product.product_variants)
                  ? product.product_variants[0]
                  : null;
                return (
                  <tr key={product.id}>
                    <td>{product.name_ar}<small>{product.name_en}</small></td>
                    <td>{product.sku || "—"}</td>
                    <td>{variant ? `${Number(variant.base_price).toFixed(2)} EGP` : "—"}</td>
                    <td>{product.is_active ? "نشط" : "متوقف"}</td>
                  </tr>
                );
              })}
              {!products?.length ? (
                <tr><td colSpan={4} className="empty">لا توجد منتجات حتى الآن.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
