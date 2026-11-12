import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { setPaymentStatus } from "@/app/actions/orders";
const labels:Record<string,string>={pending:"معلق",paid:"تم التحصيل",failed:"فشل",refunded:"مسترد",partially_refunded:"مسترد جزئيًا"};
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(n);
export default async function AccountsPage({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}) {
 const params=await searchParams; const {supabase}=await requireBackoffice(["admin","super_admin","accountant"]);
 const {data:payments,error}=await supabase.from("payments").select("id,order_id,provider,amount,currency,status,created_at,orders!inner(order_number,customer_name,customer_phone,branch_id,fulfillment,status,payment_status,total,branches(name_ar))").order("created_at",{ascending:false}).limit(300);
 const rows=payments??[]; const collected=rows.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);
 const pending=rows.filter(p=>p.status==="pending").reduce((s,p)=>s+Number(p.amount),0);
 return <main className="dashboard-content" dir="rtl"><div className="page-heading"><div><p className="eyebrow">FINANCE</p><h1>الحسابات والتحصيل</h1><p className="muted">مراجعة المدفوعات وتسجيل التحصيل النقدي ومتابعة المبالغ المعلقة.</p></div></div>
 {params.success?<p className="notice success">تم تحديث حالة التحصيل.</p>:null}{params.error?<p className="notice error">تعذر تحديث حالة الدفع. راجع الصلاحيات وحاول مرة أخرى.</p>:null}
 {error?<p className="notice error">تعذر تحميل المدفوعات.</p>:null}
 <section className="metrics-grid"><article className="metric-card"><p>المبالغ المحصلة</p><strong>{money(collected)}</strong></article><article className="metric-card"><p>مبالغ معلقة</p><strong>{money(pending)}</strong></article><article className="metric-card"><p>عدد عمليات الدفع</p><strong>{rows.length.toLocaleString("ar-EG")}</strong></article><article className="metric-card"><p>طلبات غير محصلة</p><strong>{rows.filter(p=>p.status==="pending").length.toLocaleString("ar-EG")}</strong></article></section>
 <section className="content-card"><h2>سجل المدفوعات</h2><div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الفرع</th><th>الطريقة</th><th>المبلغ</th><th>الحالة</th><th>تحديث التحصيل</th></tr></thead><tbody>
 {rows.map((p:any)=>{const o=Array.isArray(p.orders)?p.orders[0]:p.orders;const branch=Array.isArray(o?.branches)?o.branches[0]:o?.branches;return <tr key={p.id}><td>#{o?.order_number}</td><td>{o?.customer_name}<small dir="ltr">{o?.customer_phone}</small></td><td>{branch?.name_ar||"—"}</td><td>{p.provider==="cash"?"نقدي":"Paymob"}</td><td>{money(Number(p.amount))}</td><td>{labels[p.status]||p.status}</td><td><form action={setPaymentStatus} className="inline-form"><input type="hidden" name="payment_id" value={p.id}/><input type="hidden" name="order_id" value={p.order_id}/><select name="status" defaultValue={p.status}><option value="pending">معلق</option><option value="paid">تم التحصيل</option><option value="failed">فشل</option><option value="refunded">مسترد</option><option value="partially_refunded">مسترد جزئيًا</option></select><button type="submit">حفظ</button></form></td></tr>})}
 {!rows.length&&!error?<tr><td colSpan={7} className="empty">لا توجد عمليات دفع.</td></tr>:null}
 </tbody></table></div><p className="muted">يتم تحديث حالة عملية الدفع والطلب معًا حتى تظهر الأرقام بصورة متسقة في التقارير.</p></section></main>;
}
