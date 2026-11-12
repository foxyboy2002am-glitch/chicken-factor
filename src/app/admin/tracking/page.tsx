import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { updateOrderStatus } from "@/app/actions/orders";
const labels:Record<string,string>={pending_confirmation:"بانتظار التأكيد",confirmed:"تم التأكيد",preparing:"قيد التحضير",ready:"جاهز",out_for_delivery:"خرج للتوصيل",completed:"تم التسليم",cancelled:"ملغي",rejected:"مرفوض",payment_failed:"فشل الدفع"};
const next:Record<string,string[]>={pending_confirmation:["confirmed","rejected"],confirmed:["preparing","cancelled"],preparing:["ready","cancelled"],ready:["out_for_delivery","completed"],out_for_delivery:["completed","cancelled"]};
export default async function TrackingPage(){
 const {supabase,roles}=await requireBackoffice(["admin","super_admin","operations","branch_manager","branch_staff"]);
 const {data:orders,error}=await supabase.from("orders").select("id,order_number,customer_name,customer_phone,branch_id,status,fulfillment,total,created_at,branches(name_ar)").order("created_at",{ascending:false}).limit(300);
 const names:Record<string,string>={confirmed:"تم التأكيد",preparing:"قيد التحضير",ready:"جاهز",out_for_delivery:"خرج للتوصيل",completed:"تم التسليم",rejected:"مرفوض",cancelled:"ملغي"};
 return <main className="dashboard-content" dir="rtl"><div className="page-heading"><div><p className="eyebrow">OPERATIONS</p><h1>متابعة تنفيذ الطلبات</h1><p className="muted">متابعة انتقال الطلب من التأكيد إلى التحضير والتسليم.</p></div><span className="status-pill">{orders?.length??0} طلب</span></div>
 {error?<p className="notice error">تعذر تحميل الطلبات. تأكد من صلاحية الفرع.</p>:null}
 <section className="content-card"><h2>لوحة المتابعة</h2><div className="table-wrap"><table><thead><tr><th>الطلب</th><th>العميل</th><th>الفرع</th><th>طريقة الاستلام</th><th>الحالة الحالية</th><th>تحديث التنفيذ</th></tr></thead><tbody>
 {(orders??[]).map((o:any)=>{const branch=Array.isArray(o.branches)?o.branches[0]:o.branches;const options=next[o.status]||[];return <tr key={o.id}><td>#{o.order_number}<small>{new Date(o.created_at).toLocaleString("ar-EG")}</small></td><td>{o.customer_name}<small dir="ltr">{o.customer_phone}</small></td><td>{branch?.name_ar||"—"}</td><td>{o.fulfillment==="delivery"?"توصيل":"استلام"}</td><td><span className="order-state">{labels[o.status]||o.status}</span></td><td>{options.length?<form action={updateOrderStatus} className="inline-form"><input type="hidden" name="order_id" value={o.id}/><select name="status" defaultValue={options[0]}>{options.map(s=><option key={s} value={s}>{names[s]||s}</option>)}</select><button type="submit">تحديث</button></form>:<span className="muted">لا يوجد إجراء</span>}</td></tr>})}
 {!orders?.length&&!error?<tr><td colSpan={6} className="empty">لا توجد طلبات.</td></tr>:null}
 </tbody></table></div></section></main>;
}
