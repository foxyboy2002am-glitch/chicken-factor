import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { updateOrderStatus } from "@/app/actions/orders";

const statusLabels: Record<string, string> = {
  pending_confirmation: "جديد - في انتظار التأكيد",
  pending: "جديد",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  out_for_delivery: "خرج للتوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
  payment_failed: "فشل الدفع",
};

const paymentLabels: Record<string, string> = {
  pending: "في انتظار الدفع",
  paid: "مدفوع",
  failed: "فشل الدفع",
  refunded: "مسترد",
};

const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(value);

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const { roles } = await requireBackoffice(["admin","super_admin","call_center","accountant","operations","branch_manager","branch_staff"]);
  const canChangeStatus = roles.some(r => ["admin","super_admin","call_center","operations","branch_manager","branch_staff"].includes(r.role));
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, branch_id, fulfillment, status, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, customer_notes, source, created_at, branches(name_ar), order_items(id, product_name_ar, variant_name_ar, quantity, unit_price, line_total)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = orders ?? [];
  const messages: Record<string,string> = { validation: "بيانات تحديث الطلب غير صحيحة.", "not-found": "الطلب غير موجود.", update: "تعذر تحديث حالة الطلب." };

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

      {params.success ? <p className="notice success">تم تحديث حالة الطلب.</p> : null}
      {params.error ? <p className="notice error">{messages[params.error] || "حدث خطأ أثناء تنفيذ العملية."}</p> : null}
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
                <th>المصدر</th><th>الفرع</th><th>طريقة الاستلام</th>
                <th>حالة الطلب</th>
                <th>حالة الدفع</th>
                <th>الإجمالي</th>
                <th>التاريخ</th>
                <th>تحديث الحالة</th><th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id}>
                  <td>#{order.order_number}</td>
                  <td>{order.customer_name || "—"}</td>
                  <td>{order.customer_phone || "—"}</td>
                  <td>{order.source === "call_center" ? "كول سنتر" : "الموقع"}</td>\n                  <td>{Array.isArray(order.branches) ? order.branches[0]?.name_ar : (order.branches as any)?.name_ar || "—"}</td>
                  <td>{order.fulfillment === "delivery" ? "توصيل" : order.fulfillment === "pickup" ? "استلام من الفرع" : order.fulfillment || "—"}</td>
                  <td>{statusLabels[String(order.status)] ?? String(order.status)}</td>
                  <td>{paymentLabels[String(order.payment_status)] ?? String(order.payment_status)}</td>
                  <td>{money(Number(order.total ?? 0))}</td>
                  <td>{new Date(order.created_at).toLocaleString("ar-EG")}</td>
                  <td>
                    <div className="order-status-actions">
                    {order.status === "pending_confirmation" ? <form action={updateOrderStatus}><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="status" value="confirmed"/><button type="submit" className="confirm-button">تأكيد الطلب</button></form> : null}
                    <form action={updateOrderStatus} className="order-status-form">
                      <input type="hidden" name="order_id" value={order.id} />
                      <select name="status" defaultValue={String(order.status)} aria-label="حالة الطلب">
                        <option value="pending_confirmation">جديد - في انتظار التأكيد</option><option value="confirmed">تم التأكيد</option><option value="preparing">قيد التحضير</option><option value="ready">جاهز</option><option value="out_for_delivery">خرج للتوصيل</option><option value="completed">مكتمل</option><option value="rejected">مرفوض</option><option value="cancelled">ملغي</option><option value="payment_failed">فشل الدفع</option>
                      </select>
                      <button type="submit" className="secondary-button">تحديث</button>
                    </form></div>
                  </td>
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
              {!rows.length && !error ? <tr><td colSpan={12} className="empty">لا توجد طلبات مسجلة حتى الآن.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
