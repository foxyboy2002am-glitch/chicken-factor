import { createSupabaseServerClient } from "@/lib/supabase/server";

const money = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
const statusLabels: Record<string, string> = {
  pending_confirmation: "طلب جديد",
  pending: "جديد",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  out_for_delivery: "خرج للتوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [branches, products, orders, offers, todayOrders, recentOrders] = await Promise.all([
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id,total,status", { count: "exact" }).gte("created_at", startOfDay.toISOString()),
    supabase.from("orders").select("id,order_number,customer_name,customer_phone,status,total,created_at,fulfillment").order("created_at", { ascending: false }).limit(6),
  ]);

  const todayRows = todayOrders.data ?? [];
  const todaySales = todayRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const newOrders = todayRows.filter((order) => ["pending_confirmation", "pending"].includes(String(order.status))).length;
  const metrics = [
    { label: "طلبات اليوم", value: todayOrders.count ?? todayRows.length, icon: "↗", tone: "red" },
    { label: "مبيعات اليوم", value: money(todaySales), icon: "ج", tone: "gold" },
    { label: "طلبات جديدة", value: newOrders, icon: "◷", tone: "blue" },
    { label: "إجمالي الطلبات", value: orders.count ?? 0, icon: "▤", tone: "green" },
  ];

  return (
    <main className="dashboard-content admin-dashboard">
      <section className="admin-welcome">
        <div><span>CHICKEN FACTOR · MANAGEMENT</span><h1>صباح الخير 👋</h1><p>كل تفاصيل التشغيل والطلبات في مكان واحد. تابع أداء الفروع وابدأ يومك من هنا.</p></div>
        <a href="/admin/orders">متابعة الطلبات <b>←</b></a>
        <div className="admin-welcome-orbit" aria-hidden="true">CF</div>
      </section>

      <div className="admin-section-heading"><div><span>LIVE OVERVIEW</span><h2>ملخص التشغيل</h2></div><small>يتم تحديث البيانات عند وصول طلب جديد</small></div>
      <section className="metrics-grid admin-metrics">
        {metrics.map((metric) => <article className={`metric-card admin-metric ${metric.tone}`} key={metric.label}><span className="admin-metric-icon">{metric.icon}</span><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.label === "مبيعات اليوم" ? "إجمالي قيمة الطلبات المسجلة اليوم" : "حسب بيانات النظام الحالية"}</small></article>)}
      </section>

      <section className="admin-dashboard-grid">
        <article className="content-card admin-recent-orders">
          <header><div><span>RECENT ACTIVITY</span><h2>أحدث الطلبات</h2></div><a href="/admin/orders">كل الطلبات ←</a></header>
          <div className="admin-recent-list">
            {(recentOrders.data ?? []).map((order) => (
              <a href="/admin/orders" className="admin-recent-row" key={order.id}>
                <span className="admin-recent-icon">🍗</span>
                <span className="admin-recent-copy"><strong>طلب #{order.order_number}</strong><small>{order.customer_name || order.customer_phone} · {new Date(order.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</small></span>
                <span className={`admin-order-status status-${order.status}`}>{statusLabels[String(order.status)] ?? String(order.status)}</span>
                <b>{money(Number(order.total ?? 0))}</b>
              </a>
            ))}
            {!recentOrders.data?.length ? <p className="empty">لا توجد طلبات حتى الآن.</p> : null}
          </div>
        </article>

        <article className="content-card admin-quick-actions">
          <header><div><span>QUICK ACCESS</span><h2>اختصارات الإدارة</h2></div></header>
          <a href="/admin/call-center"><span>☎</span><div><strong>الكول سنتر</strong><small>تسجيل ومتابعة طلبات الهاتف</small></div><b>←</b></a>
          <a href="/admin/products"><span>🍗</span><div><strong>المنيو والمنتجات</strong><small>إدارة الأصناف والأسعار</small></div><b>←</b></a>
          <a href="/admin/reports"><span>▥</span><div><strong>التقارير</strong><small>المبيعات وأداء الفروع</small></div><b>←</b></a>
          <a href="/admin/branches"><span>⌖</span><div><strong>الفروع</strong><small>متابعة إعدادات الفروع</small></div><b>←</b></a>
          <div className="admin-inventory-mini"><span>الفروع</span><strong>{branches.count ?? 0}</strong><i /><span>المنتجات النشطة</span><strong>{products.count ?? 0}</strong><i /><span>العروض النشطة</span><strong>{offers.count ?? 0}</strong></div>
        </article>
      </section>
    </main>
  );
}
