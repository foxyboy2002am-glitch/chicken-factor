import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { createCategory, createProduct, updateProduct } from "@/app/actions/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireBackoffice(["admin","super_admin"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name_ar, name_en").order("name_ar"),
    supabase.from("products").select("id, name_ar, name_en, sku, image_path, is_active, category_id, product_variants(id, name_ar, name_en, base_price)").order("created_at", { ascending: false }),
  ]);

  return <main className="dashboard-content">
    <div className="page-heading"><div><p className="eyebrow">MENU MANAGEMENT</p><h1>المنتجات والمنيو</h1><p className="muted">إضافة وتعديل المنتجات والأسعار والصور والتصنيفات.</p></div></div>
    {params.success ? <p className="notice success">تم الحفظ بنجاح.</p> : null}
    {params.error ? <p className="notice error">تعذر الحفظ. راجع البيانات والصورة والصلاحيات.</p> : null}
    <section className="content-card"><h2>إضافة تصنيف</h2>
      <form action={createCategory} className="data-form compact">
        <label>الاسم بالعربي<input name="name_ar" required /></label><label>الاسم بالإنجليزي<input name="name_en" required /></label><label>Slug بالإنجليزي<input name="slug" placeholder="fried-chicken" required /></label><button type="submit">إضافة التصنيف</button>
      </form>
    </section>
    <section className="content-card"><h2>إضافة منتج</h2>
      <form action={createProduct} className="data-form" encType="multipart/form-data">
        <label>اسم المنتج بالعربي<input name="name_ar" required /></label><label>اسم المنتج بالإنجليزي<input name="name_en" required /></label>
        <label>التصنيف<select name="category_id" defaultValue=""><option value="">بدون تصنيف</option>{categories?.map(c => <option key={c.id} value={c.id}>{c.name_ar} / {c.name_en}</option>)}</select></label>
        <label>SKU<input name="sku" /></label><label>وصف بالعربي<textarea name="description_ar" rows={2} /></label><label>وصف بالإنجليزي<textarea name="description_en" rows={2} /></label>
        <div className="form-divider">الحجم والسعر والصورة</div><label>اسم الحجم بالعربي<input name="variant_name_ar" required /></label><label>اسم الحجم بالإنجليزي<input name="variant_name_en" required /></label><label>السعر بالجنيه<input name="price" type="number" min="0" step="0.01" required /></label><label>صورة المنتج (JPG / PNG / WebP)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label><button type="submit">حفظ المنتج</button>
      </form>
    </section>
    <section className="content-card"><h2>المنتجات المسجلة <span className="count">{products?.length ?? 0}</span></h2>
      <div className="table-wrap"><table><thead><tr><th>المنتج</th><th>التصنيف</th><th>السعر</th><th>الحالة</th><th>تعديل</th></tr></thead><tbody>
      {products?.map(p => { const v = Array.isArray(p.product_variants) ? p.product_variants[0] : null; return <tr key={p.id}>
        <td>{p.image_path ? <img src={p.image_path} alt={p.name_ar} width="64" height="64" style={{objectFit:"cover",borderRadius:8}} /> : null}<strong>{p.name_ar}</strong><small>{p.name_en}</small></td>
        <td>{categories?.find(c=>c.id===p.category_id)?.name_ar ?? "—"}</td><td>{v ? Number(v.base_price).toFixed(2)+" EGP" : "—"}</td><td>{p.is_active ? "نشط" : "متوقف"}</td>
        <td><details><summary>تعديل المنتج</summary><form action={updateProduct} className="data-form compact" encType="multipart/form-data">
          <input type="hidden" name="product_id" value={p.id}/><input type="hidden" name="variant_id" value={v?.id ?? ""}/>
          <label>الاسم بالعربي<input name="name_ar" defaultValue={p.name_ar} required /></label><label>الاسم بالإنجليزي<input name="name_en" defaultValue={p.name_en} required /></label>
          <label>التصنيف<select name="category_id" defaultValue={p.category_id ?? ""}><option value="">بدون تصنيف</option>{categories?.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
          <label>SKU<input name="sku" defaultValue={p.sku ?? ""}/></label><label>اسم الحجم<input name="variant_name_ar" defaultValue={v?.name_ar ?? ""}/></label><label>السعر بالجنيه<input name="price" type="number" min="0" step="0.01" defaultValue={v?.base_price ?? ""}/></label>
          <label>تغيير الصورة<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/></label><label>الحالة<select name="is_active" defaultValue={p.is_active ? "true":"false"}><option value="true">نشط</option><option value="false">متوقف</option></select></label>
          <button type="submit">حفظ التعديلات</button>
        </form></details></td></tr>; })}
      {!products?.length ? <tr><td colSpan={5} className="empty">لا توجد منتجات حتى الآن.</td></tr> : null}
      </tbody></table></div>
    </section>
  </main>;
}
