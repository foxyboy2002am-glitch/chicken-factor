import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase.from("orders")
    .select("id, order_number, customer_name, branch_id, status, payment_status, total, created_at")
    .order("created_at", { ascending: false }).limit(500);
  const rows = orders ?? [];
  const revenue = rows.filter(o => o.payment_status === "paid" || o.status === "completed")
    .reduce((sum,o)=>sum+Number(o.total ?? 0),0);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayRows = rows.filter(o=>new Date(o.created_at)>=today);
  const todayRevenue = todayRows.filter(o=>o.payment_status === "paid" || o.status === "completed")
    .reduce((sum,o)=>sum+Number(o.total ?? 0),0);
  const money = (n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(n);
  return <main className="dashboard-content">
    <div className="page-heading"><div><p className="eyebrow">REPORTS</p><h1>التقارير والمبيعات</h1><p className="muted">ملخص الطلبات والمبيعات المسجلة في قاعدة البيانات.</p></div></div>
    {error ? <p className="notice error">تعذر تحميل بيانات التقارير. راجع صلاحيات قراءة الطلبات.</p> : null}
    <section className="metrics-grid">
      <article className="metric-card"><p>إجمالي الطلبات المعروضة</p><strong>{rows.length}</strong></article>
      <article className="metric-card"><p>طلبات اليوم</p><strong>{todayRows.length}</strong></article>
      <article className="metric-card"><p>إجمالي المبيعات المحصلة / المكتملة</p><strong>{money(revenue)}</strong></article>
      <article className="metric-card"><p>مبيعات اليوم المحصلة / المكتملة</p><strong>{money(todayRevenue)}</strong></article>
    </section>
    <section className="content-card"><h2>أحدث الطلبات</h2><div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>التاريخ</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th></tr></thead><tbody>
      {rows.slice(0,100).map(o=><tr key={o.id}><td>#{o.order_number}</td><td>{o.customer_name}</td><td>{new Date(o.created_at).toLocaleString("ar-EG")}</td><td>{o.status}</td><td>{o.payment_status}</td><td>{money(Number(o.total))}</td></tr>)}
      {!rows.length ? <tr><td colSpan={6} className="empty">لا توجد طلبات مسجلة حتى الآن.</td></tr> : null}
    </tbody></table></div></section>
  </main>;
}
