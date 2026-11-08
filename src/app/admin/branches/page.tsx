import { createBranch } from "@/app/actions/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function BranchesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: branches, error } = await supabase.from("branches")
    .select("id, code, name_ar, name_en, phone, address_ar, is_active, accepts_delivery, accepts_pickup")
    .order("created_at", { ascending: false });
  return <main className="dashboard-content">
    <div className="page-heading"><div><p className="eyebrow">BRANCH MANAGEMENT</p><h1>إدارة الفروع</h1><p className="muted">إضافة ومراجعة فروع Chicken Factor.</p></div></div>
    {params.success ? <p className="notice success">تمت العملية بنجاح.</p> : null}
    {params.error || error ? <p className="notice error">تعذر تحميل أو حفظ البيانات. تأكد من تطبيق Migration صلاحيات الإدارة.</p> : null}
    <section className="content-card"><h2>إضافة فرع جديد</h2>
      <form action={createBranch} className="data-form">
        <label>كود الفرع<input name="code" placeholder="ZAG-01" required /></label>
        <label>اسم الفرع بالعربي<input name="name_ar" required /></label>
        <label>اسم الفرع بالإنجليزي<input name="name_en" required /></label>
        <label>رقم الهاتف<input name="phone" /></label>
        <label>العنوان بالعربي<input name="address_ar" /></label>
        <label>العنوان بالإنجليزي<input name="address_en" /></label>
        <button type="submit">حفظ الفرع</button>
      </form>
    </section>
    <section className="content-card"><h2>الفروع المسجلة <span className="count">{branches?.length ?? 0}</span></h2>
      <div className="table-wrap"><table><thead><tr><th>الكود</th><th>الفرع</th><th>الهاتف</th><th>التوصيل</th><th>الاستلام</th><th>الحالة</th></tr></thead><tbody>
        {branches?.map((b) => <tr key={b.id}><td>{b.code}</td><td>{b.name_ar}<small>{b.name_en}</small></td><td>{b.phone || "—"}</td><td>{b.accepts_delivery ? "متاح" : "متوقف"}</td><td>{b.accepts_pickup ? "متاح" : "متوقف"}</td><td>{b.is_active ? "نشط" : "متوقف"}</td></tr>)}
        {!branches?.length ? <tr><td colSpan={6} className="empty">لا توجد فروع مسجلة حتى الآن.</td></tr> : null}
      </tbody></table></div>
    </section>
  </main>;
}
