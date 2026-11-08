import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const [branches, products, orders, offers] = await Promise.all([
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }),
  ]);

  const metrics = [
    { label: "الفروع النشطة", value: branches.count ?? 0 },
    { label: "المنتجات", value: products.count ?? 0 },
    { label: "إجمالي الطلبات", value: orders.count ?? 0 },
    { label: "العروض", value: offers.count ?? 0 },
  ];

  return (
    <main className="dashboard-content">
      <div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>أهلاً بك في Chicken Factor</h1><p className="muted">ملخص إدارة المطعم سيظهر هنا.</p></div><span className="status-pill">النظام متصل</span></div>
      <section className="metrics-grid">
        {metrics.map((metric) => <article className="metric-card" key={metric.label}><p>{metric.label}</p><strong>{metric.value}</strong></article>)}
      </section>
      <section className="welcome-panel">
        <h2>تم تجهيز أساس لوحة الإدارة</h2>
        <p>الخطوة التالية هي تفعيل إدارة الفروع والمنيو والعروض والطلبات بصلاحيات منفصلة لكل فرع.</p>
      </section>
    </main>
  );
}
