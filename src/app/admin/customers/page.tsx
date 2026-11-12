import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBackoffice } from "@/lib/auth/require-backoffice";

type Customer = { id:string; full_name:string; phone:string; phone_normalized:string; points_balance:number; created_at:string; last_order_at:string|null };
const number=(n:number)=>new Intl.NumberFormat("ar-EG").format(n);
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP",maximumFractionDigits:2}).format(n);

export default async function CustomersPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const params=await searchParams;
  await requireBackoffice(["admin","super_admin","accountant","operations","call_center"]);
  const supabase=await createSupabaseServerClient();
  const query=(params.q||"").trim().slice(0,80);
  const page=Math.max(1,Math.min(100,Number(params.page)||1));
  const from=(page-1)*50;
  let request=supabase.from("customers").select("id,full_name,phone,phone_normalized,points_balance,created_at,last_order_at",{count:"exact"}).order("last_order_at",{ascending:false,nullsFirst:false}).range(from,from+49);
  if(query) request=request.or(`full_name.ilike.%${query.replace(/[,%()]/g," ")}%,phone.ilike.%${query.replace(/[,%()]/g," ")}%`);
  const {data,error,count}=await request;
  const rows=(data||[]) as Customer[];
  const {data:summary}=await supabase.from("customers").select("points_balance");
  const points=(summary||[]).reduce((sum,row)=>sum+Number(row.points_balance||0),0);
  return <main className="dashboard-content customer-directory" dir="rtl">
    <div className="page-heading"><div><p className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</p><h1>قاعدة بيانات العملاء</h1><p className="muted">ملف موحد لكل عميل باستخدام رقم الموبايل، مع رصيد نقاط الولاء وسجل التعامل.</p></div><a className="admin-users-back" href="/admin/reports">العودة للتقارير ←</a></div>
    <section className="metrics-grid reports-kpis">
      <article className="metric-card"><p>إجمالي العملاء</p><strong>{number(count||0)}</strong><small>أرقام موبايل فريدة</small></article>
      <article className="metric-card"><p>النقاط المستحقة حاليًا</p><strong>{number(points)}</strong><small>إجمالي أرصدة العملاء</small></article>
    </section>
    <section className="content-card">
      <div className="report-card-heading"><div><h2>دليل العملاء</h2><p>يتم إنشاء سجل تلقائي عند أول طلب، ويُربط العميل بكل طلباته بنفس رقم الهاتف.</p></div><span>{number(count||0)} عميل</span></div>
      <form className="customer-search" method="get"><input name="q" defaultValue={query} placeholder="ابحث بالاسم أو رقم الموبايل" aria-label="ابحث بالاسم أو رقم الموبايل"/><button type="submit">بحث</button>{query?<a href="/admin/customers">مسح</a>:null}</form>
      {error?<p className="notice error">تعذر تحميل قاعدة بيانات العملاء. راجع صلاحيات الحساب.</p>:null}
      <div className="table-wrap"><table><thead><tr><th>العميل</th><th>رقم الموبايل</th><th>رصيد النقاط</th><th>تاريخ التسجيل</th><th>آخر طلب</th></tr></thead><tbody>
        {rows.map(customer=><tr key={customer.id}><td><strong>{customer.full_name}</strong></td><td dir="ltr">{customer.phone}</td><td><span className="customer-points-pill">★ {number(customer.points_balance)} نقطة</span></td><td>{new Date(customer.created_at).toLocaleDateString("ar-EG")}</td><td>{customer.last_order_at?new Date(customer.last_order_at).toLocaleDateString("ar-EG"):"—"}</td></tr>)}
        {!rows.length&&!error?<tr><td colSpan={5} className="empty">لا يوجد عملاء مطابقون للبحث.</td></tr>:null}
      </tbody></table></div>
      <div className="customer-pagination"><span>صفحة {number(page)} من {number(Math.max(1,Math.ceil((count||0)/50)))}</span><div>{page>1?<a href={`?q=${encodeURIComponent(query)}&page=${page-1}`}>السابق</a>:null}{from+50<(count||0)?<a href={`?q=${encodeURIComponent(query)}&page=${page+1}`}>التالي</a>:null}</div></div>
    </section>
    <p className="admin-users-security-note">🔒 أرقام العملاء وبياناتهم متاحة لموظفي الإدارة المخولين فقط، ولا تظهر في واجهة المتجر العامة.</p>
  </main>;
}
