import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = {
  pending: "جديد",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  out_for_delivery: "خرج للتوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const paymentLabels: Record<string, string> = {
  pending: "في انتظار الدفع",
  paid: "مدفوع",
  failed: "فشل الدفع",
  refunded: "مسترد",
};

const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(value);

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, branch_id, fulfillment, status, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, customer_notes, created_at, order_items(id, product_name_ar, variant_name_ar, quantity, unit_price, line_total)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = orders ?? [];

  return (
    <main className="dashboard-content" dir="rtl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORDERS</p>
          <h1>إدارة الطلبات</h1>
          <p className="muted">متابعة الطلبات المسجلة وتفاصيل كل طلب.</p>
        </div>
        <span className="status-pill">{rows.length} طلب</span>
      </div>

      {error ? (
        <section className="content-card">
          <p className="notice error">تعذر تحميل الطلبات من قاعدة البيانات. تأكد من صلاحيات قراءة جدول الطلبات وتفاصيلها.</p>
        </section>
      ) : null}

      <section className="content-card">
        <h2>أحدث الطلبات</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>رقم الهاتف</th>
                <th>طريقة الاستلام</th>
                <th>حالة الطلب</th>
                <th>حالة الدفع</th>
                <th>الإجمالي</th>
                <th>التاريخ</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id}>
                  <td>#{order.order_number}</td>
                  <td>{order.customer_name || "—"}</td>
                  <td>{order.customer_phone || "—"}</td>
                  <td>{order.fulfillment === "delivery" ? "توصيل" : order.fulfillment === "pickup" ? "استلام من الفرع" : order.fulfillment || "—"}</td>
                  <td>{statusLabels[String(order.status)] ?? String(order.status)}</td>
                  <td>{paymentLabels[String(order.payment_status)] ?? String(order.payment_status)}</td>
                  <td>{money(Number(order.total ?? 0))}</td>
                  <td>{new Date(order.created_at).toLocaleString("ar-EG")}</td>
                  <td>
                    <details>
                      <summary>عرض</summary>
                      <div className="order-details">
                        {(order.order_items ?? []).map((item) => (
                          <p key={item.id}>{item.product_name_ar}{item.variant_name_ar ? ` - ${item.variant_name_ar}` : ""} × {item.quantity} — {money(Number(item.line_total ?? 0))}</p>
                        ))}
                        <p>الإجمالي قبل الخصم: {money(Number(order.subtotal ?? 0))}</p>
                        <p>الخصم: {money(Number(order.discount_total ?? 0))}</p>
                        <p>التوصيل: {money(Number(order.delivery_fee ?? 0))}</p>
                        {order.customer_notes ? <p>ملاحظات العميل: {order.customer_notes}</p> : null}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {!rows.length && !error ? <tr><td colSpan={9} className="empty">لا توجد طلبات مسجلة حتى الآن.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
