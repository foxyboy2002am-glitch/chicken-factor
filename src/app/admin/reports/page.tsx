import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBackoffice } from "@/lib/auth/require-backoffice";
import PrintReportButton from "./print-button";

type ReportOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  branch_id: string;
  status: string;
  payment_status: string;
  total: number | string;
  created_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(value);

function validDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  await requireBackoffice(["admin","super_admin","accountant","operations"]);
  const now = new Date();
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const requestedFrom = validDate(params.from);
  const requestedTo = validDate(params.to);
  const from = requestedFrom ?? defaultFrom;
  const to = requestedTo ?? defaultTo;
  const invalidRange = from > to;
  const endExclusive = new Date(to);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const supabase = await createSupabaseServerClient();
  let rows: ReportOrder[] = [];
  let errorMessage = "";
  let totalMatching = 0;

  if (!invalidRange) {
    const filters = (query: any) => query
      .gte("created_at", from.toISOString())
      .lt("created_at", endExclusive.toISOString());

    const { count, error: countError } = await filters(
      supabase.from("orders").select("id", { count: "exact", head: true })
    );
    if (countError) errorMessage = countError.message;
    totalMatching = count ?? 0;

    if (!countError) {
      const pageSize = 1000;
      for (let offset = 0; offset < totalMatching && offset < 10000; offset += pageSize) {
        const { data, error } = await filters(
          supabase.from("orders")
            .select("id,order_number,customer_name,branch_id,status,payment_status,total,created_at")
            .order("created_at", { ascending: false })
            .range(offset, Math.min(offset + pageSize - 1, 9999))
        );
        if (error) {
          errorMessage = error.message;
          rows = [];
          break;
        }
        rows.push(...((data ?? []) as ReportOrder[]));
      }
    }
  }

  const paidRows = rows.filter((order) => order.payment_status === "paid");
  const revenue = paidRows.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const orderValue = rows.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingValue = rows.filter(order => order.payment_status === "pending").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingPayment = rows.filter((order) => order.payment_status === "pending");
  const failedPayment = rows.filter((order) => order.payment_status === "failed");
  const completedRows = rows.filter((order) => order.status === "completed");
  const statusCounts = rows.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const paymentCounts = rows.reduce<Record<string, number>>((acc, order) => {
    acc[order.payment_status] = (acc[order.payment_status] ?? 0) + 1;
    return acc;
  }, {});
  const limited = totalMatching > 10000;

  return (
    <main className="dashboard-content" dir="rtl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">REPORTS & ANALYTICS</p>
          <h1>التقارير والمبيعات</h1>
          <p className="muted">ملخص الطلبات والتحصيل والمدفوعات خلال الفترة المحددة.</p>
        </div>
      </div>

      <section className="content-card">
        <div className="report-toolbar"><form method="get" className="report-filter-form">
          <label>من تاريخ<input type="date" name="from" defaultValue={dayString(from)} /></label>
          <label>إلى تاريخ<input type="date" name="to" defaultValue={dayString(to)} /></label>
          <button type="submit">تطبيق الفترة</button>
          <a href="/admin/reports">آخر 30 يوم</a>
        </form>
        {invalidRange ? <p className="notice error">تاريخ البداية يجب أن يكون قبل تاريخ النهاية.</p> : null}
        {errorMessage ? <p className="notice error">تعذر تحميل التقارير. راجع صلاحيات قاعدة البيانات ثم أعد المحاولة.</p> : null}
        {limited ? <p className="notice error">الفترة تحتوي على أكثر من 10,000 طلب؛ تم إيقاف التحميل لحماية أداء لوحة الإدارة. قلل الفترة الزمنية.</p> : null}
      </section>

      {!invalidRange && !errorMessage ? (
        <>
          <section className="metrics-grid">
            <article className="metric-card"><p>إجمالي الطلبات في الفترة</p><strong>{totalMatching.toLocaleString("ar-EG")}</strong></article>
            <article className="metric-card"><p>قيمة الطلبات الإجمالية</p><strong>{money(orderValue)}</strong></article>
            <article className="metric-card"><p>المبالغ المحصلة فعليًا</p><strong>{money(revenue)}</strong></article>
            <article className="metric-card"><p>مبالغ معلقة للتحصيل</p><strong>{money(pendingValue)}</strong></article>
            <article className="metric-card"><p>طلبات مكتملة</p><strong>{completedRows.length.toLocaleString("ar-EG")}</strong></article>
            <article className="metric-card"><p>مدفوعات معلقة</p><strong>{pendingPayment.length.toLocaleString("ar-EG")}</strong></article>
            <article className="metric-card"><p>مدفوعات فاشلة</p><strong>{failedPayment.length.toLocaleString("ar-EG")}</strong></article>
            <article className="metric-card"><p>عدد عمليات الدفع الناجحة</p><strong>{paidRows.length.toLocaleString("ar-EG")}</strong></article>
          </section>

          <section className="content-card">
            <h2>حالات الطلبات</h2>
            <div className="report-breakdown">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div className="report-breakdown-row" key={status}><span>{status}</span><strong>{count.toLocaleString("ar-EG")}</strong></div>
              ))}
              {!Object.keys(statusCounts).length ? <p className="empty">لا توجد طلبات في الفترة المحددة.</p> : null}
            </div>
          </section>

          <section className="content-card">
            <h2>حالات الدفع</h2>
            <div className="report-breakdown">
              {Object.entries(paymentCounts).map(([status, count]) => (
                <div className="report-breakdown-row" key={status}><span>{status}</span><strong>{count.toLocaleString("ar-EG")}</strong></div>
              ))}
              {!Object.keys(paymentCounts).length ? <p className="empty">لا توجد مدفوعات في الفترة المحددة.</p> : null}
            </div>
          </section>

          <section className="content-card">
            <h2>أحدث الطلبات في الفترة</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>رقم الطلب</th><th>العميل</th><th>التاريخ</th><th>حالة الطلب</th><th>حالة الدفع</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  {rows.slice(0, 200).map((order) => (
                    <tr key={order.id}>
                      <td>#{order.order_number}</td><td>{order.customer_name}</td>
                      <td>{new Date(order.created_at).toLocaleString("ar-EG")}</td>
                      <td>{order.status}</td><td>{order.payment_status}</td><td>{money(Number(order.total))}</td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td colSpan={6} className="empty">لا توجد طلبات مسجلة في الفترة المحددة.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <p className="muted">المعروض في الجدول أحدث 200 طلب. إجماليات الفترة محسوبة من الطلبات المحملة حتى حد 10,000 طلب. استخدم زر تصدير PDF ثم اختر Save as PDF من نافذة الطباعة.</p>
          </section>
        </>
      ) : null}
    </main>
  );
}
