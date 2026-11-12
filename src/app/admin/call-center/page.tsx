import AutoRefresh from "@/components/auto-refresh";
import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { assignOrderBranch, updateOrderStatus } from "@/app/actions/orders";
import CallCenterEntry from "./order-entry";

const labels:Record<string,string>={pending_confirmation:"جديد - في انتظار التأكيد",confirmed:"تم التأكيد",preparing:"قيد التحضير",ready:"جاهز",out_for_delivery:"خرج للتوصيل",completed:"مكتمل",cancelled:"ملغي",rejected:"مرفوض",payment_failed:"فشل الدفع"};
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(n);
export default async function CallCenterPage({searchParams}:{searchParams:Promise<{error?:string;success?:string;order?:string}>}) {
  const params=await searchParams;
  const {supabase}=await requireBackoffice(["admin","super_admin","call_center"]);
  const [{data:branches},{data:variants},{data:orders,error}] = await Promise.all([
    supabase.from("branches").select("id,name_ar").eq("is_active",true).order("priority"),
    supabase.from("product_variants").select("id,name_ar,name_en,base_price,products!inner(name_ar,is_active)").eq("is_active",true).eq("products.is_active",true).order("name_ar"),
    supabase.from("orders").select("id,order_number,customer_name,customer_phone,branch_id,fulfillment,status,payment_status,total,created_at,delivery_address_snapshot,customer_notes,branches(name_ar),order_items(id,product_name_ar,variant_name_ar,quantity,line_total)").order("created_at",{ascending:false}).limit(150)
  ]);
  const messages:Record<string,string>={validation:"راجع بيانات العميل والأصناف والكميات.",create:"تعذر تسجيل الطلب. تحقق من الفرع والمنتجات ثم حاول مرة أخرى.",assign:"تعذر تحويل الطلب للفرع.",branch:"الفرع غير متاح.", "not-found":"الطلب غير موجود."};
  return <main className="dashboard-content" dir="rtl">
    <div className="page-heading"><div><p className="eyebrow">CALL CENTER</p><h1>مركز استقبال الطلبات</h1><p className="muted">استقبال طلبات الموقع وتسجيل طلبات الهاتف وتوجيهها للفروع.</p></div><div className="live-tools"><AutoRefresh/><span className="status-pill">{orders?.length??0} طلب حديث</span></div></div>
    {params.error?<p className="notice error">{messages[params.error]||"حدث خطأ أثناء تنفيذ العملية."}</p>:null}
    {params.success==="created"?<p className="notice success">تم تسجيل الطلب رقم #{params.order} وإرساله إلى الفرع.</p>:null}
    {params.success==="assigned"?<p className="notice success">تم تحويل الطلب إلى الفرع المحدد.</p>:null}
    <section className="content-card"><h2>تسجيل طلب جديد من مكالمة هاتفية</h2>
      {!branches?.length||!variants?.length?<p className="notice error">لا يمكن التسجيل قبل تفعيل فرع ومنتج واحد على الأقل.</p>:<CallCenterEntry branches={branches} variants={(variants??[]) as any}/>}
    </section>
    <section className="content-card"><h2>صندوق الطلبات الواردة</h2>
      {error?<p className="notice error">تعذر تحميل الطلبات. راجع صلاحيات الحساب.</p>:null}
      <div className="table-wrap"><table><thead><tr><th>الطلب</th><th>العميل</th><th>الهاتف</th><th>الفرع</th><th>النوع</th><th>الحالة</th><th>الإجمالي</th><th>الإجراءات</th></tr></thead><tbody>
      {(orders??[]).map((o:any)=><tr key={o.id}><td>#{o.order_number}<small>{new Date(o.created_at).toLocaleString("ar-EG")}</small></td>
        <td>{o.customer_name}<details><summary>التفاصيل</summary><div className="order-details">{(o.order_items??[]).map((it:any)=><p key={it.id}>{it.product_name_ar} {it.variant_name_ar||""} × {it.quantity} — {money(Number(it.line_total))}</p>)}{o.delivery_address_snapshot?<p>العنوان: {Object.values(o.delivery_address_snapshot).filter(Boolean).join("، ")}</p>:null}{o.customer_notes?<p>ملاحظات: {o.customer_notes}</p>:null}</div></details></td>
        <td dir="ltr">{o.customer_phone}</td><td>{Array.isArray(o.branches)?o.branches[0]?.name_ar:o.branches?.name_ar||"—"}</td><td>{o.fulfillment==="delivery"?"توصيل":"استلام"}</td><td><span className="order-state">{labels[o.status]||o.status}</span></td><td>{money(Number(o.total))}</td>
        <td><div className="cc-actions">{o.status==="pending_confirmation"?<form action={updateOrderStatus}><input type="hidden" name="order_id" value={o.id}/><input type="hidden" name="status" value="confirmed"/><button type="submit">تأكيد الطلب</button></form>:null}
          <form action={assignOrderBranch}><input type="hidden" name="order_id" value={o.id}/><select name="branch_id" defaultValue={o.branch_id} aria-label="تغيير الفرع">{(branches??[]).map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}</select><button type="submit" className="secondary-button">تحويل</button></form>
        </div></td></tr>)}
      {!orders?.length&&!error?<tr><td colSpan={8} className="empty">لا توجد طلبات حتى الآن.</td></tr>:null}
      </tbody></table></div>
    </section>
  </main>;
}
