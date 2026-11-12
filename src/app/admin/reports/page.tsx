import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBackoffice } from "@/lib/auth/require-backoffice";
import PrintReportButton from "./print-button";
type Order={id:string;order_number:number;customer_name:string;customer_phone:string;customer_profile_id:string|null;branch_id:string;status:string;payment_status:string;fulfillment:string;source:string|null;subtotal:number|string;discount_total:number|string;delivery_fee:number|string;total:number|string;created_at:string;branches?:{name_ar:string}|{name_ar:string}[]|null};
type Item={product_name_ar:string;variant_name_ar:string|null;quantity:number;line_total:number|string;orders:{created_at:string;status:string;branch_id:string}|{created_at:string;status:string;branch_id:string}[]};
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP",maximumFractionDigits:2}).format(n);
const count=(n:number)=>n.toLocaleString("ar-EG");
const orderLabels:Record<string,string>={pending_confirmation:"بانتظار التأكيد",confirmed:"تم التأكيد",preparing:"قيد التحضير",ready:"جاهز",out_for_delivery:"خرج للتوصيل",completed:"مكتمل",rejected:"مرفوض",cancelled:"ملغي",payment_failed:"فشل الدفع"};
const payLabels:Record<string,string>={pending:"معلق",paid:"تم التحصيل",failed:"فشل",refunded:"مسترد",partially_refunded:"مسترد جزئيًا"};
const dateValue=(s:string|undefined)=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+"T00:00:00.000Z"):null;
const day=(d:Date)=>d.toISOString().slice(0,10);
export default async function ReportsPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 const params=await searchParams;await requireBackoffice(["admin","super_admin","accountant","operations"]);
 const now=new Date(),toDefault=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),fromDefault=new Date(toDefault);fromDefault.setUTCDate(fromDefault.getUTCDate()-29);
 const from=dateValue(params.from)||fromDefault,to=dateValue(params.to)||toDefault,invalid=from>to;
 const end=new Date(to);end.setUTCDate(end.getUTCDate()+1);
 const days=Math.max(1,Math.round((end.getTime()-from.getTime())/86400000));
 const prevEnd=new Date(from),prevFrom=new Date(from);prevFrom.setUTCDate(prevFrom.getUTCDate()-days);
 const supabase=await createSupabaseServerClient();
 let rows:Order[]=[],items:Item[]=[],totalMatching=0,error="";
 if(!invalid){
  const base=(q:any,start:Date,finish:Date)=>q.gte("created_at",start.toISOString()).lt("created_at",finish.toISOString());
  const {count:exact,error:e}=await base(supabase.from("orders").select("id",{count:"exact",head:true}),from,end);
  totalMatching=exact||0;if(e)error=e.message;
  if(!e&&totalMatching<=20000){
   for(let offset=0;offset<totalMatching;offset+=1000){
    const {data,error:loadError}=await base(supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_profile_id,branch_id,status,payment_status,fulfillment,source,subtotal,discount_total,delivery_fee,total,created_at,branches(name_ar)").order("created_at",{ascending:false}).range(offset,Math.min(offset+999,totalMatching-1)),from,end);
    if(loadError){error=loadError.message;rows=[];break;}rows.push(...(data as Order[]||[]));
   }
   if(!error){
    const itemQuery=()=>supabase.from("order_items").select("product_name_ar,variant_name_ar,quantity,line_total,orders!inner(created_at,status,branch_id)").gte("orders.created_at",from.toISOString()).lt("orders.created_at",end.toISOString());
    const {count:itemCount,error:itemCountError}=await supabase.from("order_items").select("id",{count:"exact",head:true}).gte("orders.created_at",from.toISOString()).lt("orders.created_at",end.toISOString());
    if(itemCountError) error=itemCountError.message;
    else if((itemCount||0)>50000) error="الفترة تحتوي على أكثر من 50,000 بند أصناف؛ قلل الفترة الزمنية.";
    else for(let offset=0;offset<(itemCount||0);offset+=1000){
      const {data,error:itemError}=await itemQuery().range(offset,Math.min(offset+999,(itemCount||0)-1));
      if(itemError){error=itemError.message;items=[];break;}
      items.push(...((data as Item[])||[]));
    }
   }
  }else if(!e)error="الفترة تحتوي على أكثر من 20,000 طلب؛ قلل الفترة الزمنية.";
 }
 const {data:prevRows}=!invalid?await basePrev():{data:[] as any[]};
 async function basePrev(){return supabase.from("orders").select("total,payment_status,status").gte("created_at",prevFrom.toISOString()).lt("created_at",prevEnd.toISOString()).limit(20000)}
 const [loyaltyLedger,customerCountResult,newCustomerResult,customerBalancesResult,topCustomerResult]=await Promise.all([
  supabase.from("customer_points_ledger").select("points_delta,entry_type,eligible_amount").gte("created_at",from.toISOString()).lt("created_at",end.toISOString()),
  supabase.from("customers").select("id",{count:"exact",head:true}),
  supabase.from("customers").select("id",{count:"exact",head:true}).gte("created_at",from.toISOString()).lt("created_at",end.toISOString()),
  supabase.from("customers").select("points_balance").range(0,9999),
  supabase.from("customers").select("id,full_name,phone,points_balance").gt("points_balance",0).order("points_balance",{ascending:false}).limit(10)
 ]);
 const earnedPoints=(loyaltyLedger.data||[]).filter(x=>x.points_delta>0).reduce((s,x)=>s+Number(x.points_delta),0);
 const reversedPoints=Math.abs((loyaltyLedger.data||[]).filter(x=>x.points_delta<0).reduce((s,x)=>s+Number(x.points_delta),0));
 const loyaltyNet=earnedPoints-reversedPoints;
 const pointsOutstanding=(customerBalancesResult.data||[]).reduce((s,x)=>s+Number(x.points_balance||0),0);
 const uniqueCustomers=new Set(rows.map(o=>o.customer_profile_id).filter(Boolean)).size;
 const totalValue=rows.reduce((s,o)=>s+Number(o.total||0),0);
 const collected=rows.filter(o=>o.payment_status==="paid").reduce((s,o)=>s+Number(o.total||0),0);
 const pending=rows.filter(o=>o.payment_status==="pending").reduce((s,o)=>s+Number(o.total||0),0);
 const discounts=rows.reduce((s,o)=>s+Number(o.discount_total||0),0),deliveryFees=rows.reduce((s,o)=>s+Number(o.delivery_fee||0),0),subtotal=rows.reduce((s,o)=>s+Number(o.subtotal||0),0);
 const completed=rows.filter(o=>o.status==="completed"),cancelled=rows.filter(o=>["cancelled","rejected"].includes(o.status));
 const prevTotal=(prevRows||[]).reduce((s,o)=>s+Number(o.total||0),0),growth=prevTotal?((totalValue-prevTotal)/prevTotal)*100:0;
 const statusCounts=rows.reduce<Record<string,number>>((a,o)=>(a[o.status]=(a[o.status]||0)+1,a),{});
 const payCounts=rows.reduce<Record<string,number>>((a,o)=>(a[o.payment_status]=(a[o.payment_status]||0)+1,a),{});
 const fulfillCounts=rows.reduce<Record<string,number>>((a,o)=>(a[o.fulfillment]=(a[o.fulfillment]||0)+1,a),{});
 const sourceCounts=rows.reduce<Record<string,number>>((a,o)=>{const k=o.source==="call_center"?"كول سنتر":"الموقع";a[k]=(a[k]||0)+1;return a},{});
 const daily=new Map<string,{orders:number;value:number;paid:number}>();
 for(let i=0;i<days;i++){const d=new Date(from);d.setUTCDate(d.getUTCDate()+i);daily.set(day(d),{orders:0,value:0,paid:0})}
 for(const o of rows){const k=day(new Date(o.created_at)),v=daily.get(k);if(v){v.orders++;v.value+=Number(o.total||0);if(o.payment_status==="paid")v.paid+=Number(o.total||0)}}
 const branches=new Map<string,{name:string;orders:number;value:number;paid:number}>();
 for(const o of rows){const b=Array.isArray(o.branches)?o.branches[0]:o.branches;const name=b?.name_ar||"غير محدد";const x=branches.get(o.branch_id)||{name,orders:0,value:0,paid:0};x.orders++;x.value+=Number(o.total||0);if(o.payment_status==="paid")x.paid+=Number(o.total||0);branches.set(o.branch_id,x)}
 const products=new Map<string,{name:string;qty:number;value:number}>();
 for(const it of items){const name=[it.product_name_ar,it.variant_name_ar].filter(Boolean).join(" - ");const x=products.get(name)||{name,qty:0,value:0};x.qty+=Number(it.quantity||0);x.value+=Number(it.line_total||0);products.set(name,x)}
 const topBranches=[...branches.values()].sort((a,b)=>b.value-a.value).slice(0,8),topProducts=[...products.values()].sort((a,b)=>b.qty-a.qty).slice(0,10);
 const maxDay=Math.max(1,...[...daily.values()].map(x=>x.value));
 const maxBranch=Math.max(1,...topBranches.map(x=>x.value)),maxProduct=Math.max(1,...topProducts.map(x=>x.qty));
 const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;
 return <main className="dashboard-content reports-pro" dir="rtl">
 <div className="page-heading"><div><p className="eyebrow">BUSINESS INTELLIGENCE</p><h1>مركز التقارير والتحليلات</h1><p className="muted">تحليل المبيعات والتحصيل والأداء التشغيلي والفروع والمنتجات والعملاء ونقاط الولاء.</p></div><span className="status-pill">{count(totalMatching)} طلب في الفترة</span></div>
 <section className="content-card"><div className="report-toolbar"><form method="get" className="report-filter-form"><label>من تاريخ<input type="date" name="from" defaultValue={day(from)}/></label><label>إلى تاريخ<input type="date" name="to" defaultValue={day(to)}/></label><button type="submit">تحديث التقرير</button><a href="/admin/reports">آخر 30 يوم</a></form><PrintReportButton/></div>
 <p className="report-period">الفترة: {day(from)} — {day(to)} · مقارنة بالفترة السابقة المماثلة</p>
 {invalid?<p className="notice error">تاريخ البداية يجب أن يكون قبل تاريخ النهاية.</p>:null}{error?<p className="notice error">تعذر تحميل بعض بيانات التقرير. {error.includes("20,000")?error:"راجع صلاحيات القراءة وحاول تقليل الفترة."}</p>:null}</section>
 {!invalid&&!error?<>
 <div className="reports-section-title"><h2>المؤشرات الرئيسية</h2><span>OVERVIEW</span></div>
 <section className="metrics-grid reports-kpis">
 <article className="metric-card"><p>إجمالي قيمة الطلبات</p><strong>{money(totalValue)}</strong><small>{count(rows.length)} طلب</small></article>
 <article className="metric-card"><p>التحصيل الفعلي</p><strong>{money(collected)}</strong><small>{pct(collected,totalValue)}% من قيمة الطلبات</small></article>
 <article className="metric-card"><p>مبالغ قيد التحصيل</p><strong>{money(pending)}</strong><small>{count(rows.filter(o=>o.payment_status==="pending").length)} عملية</small></article>
 <article className="metric-card"><p>متوسط قيمة الطلب</p><strong>{money(rows.length?totalValue/rows.length:0)}</strong><small>متوسط السلة</small></article>
 <article className="metric-card"><p>قيمة الأصناف قبل الخصم</p><strong>{money(subtotal)}</strong></article>
 <article className="metric-card"><p>إجمالي الخصومات</p><strong>{money(discounts)}</strong></article>
 <article className="metric-card"><p>رسوم التوصيل</p><strong>{money(deliveryFees)}</strong></article>
 <article className="metric-card"><p>طلبات مكتملة</p><strong>{count(completed.length)}</strong><small>{pct(completed.length,rows.length)}% من الطلبات</small></article>
 <article className="metric-card"><p>العملاء النشطون في الفترة</p><strong>{count(uniqueCustomers)}</strong><small>أرقام موبايل فريدة</small></article>
 <article className="metric-card"><p>نقاط مكتسبة خلال الفترة</p><strong>{count(loyaltyNet)}</strong><small>{count(earnedPoints)} مكتسبة · {count(reversedPoints)} معكوسة</small></article>
 <article className="metric-card"><p>إجمالي أرصدة النقاط</p><strong>{count(pointsOutstanding)}</strong><small>{count(customerCountResult.count||0)} عميل مسجل</small></article>
 <article className="metric-card"><p>عملاء جدد</p><strong>{count(newCustomerResult.count||0)}</strong><small>تم تسجيلهم في الفترة</small></article>
 </section>
 <section className="reports-grid">
 <article className="content-card"><div className="report-card-heading"><div><h2>اتجاه المبيعات اليومي</h2><p>قيمة الطلبات والتحصيل يومًا بيوم</p></div><span>DAILY TREND</span></div>
 <div className="daily-chart">{[...daily.entries()].map(([d,v])=><div className="daily-column" key={d} title={d+" · "+money(v.value)}><div className="daily-bars"><i style={{height:(v.value/maxDay*100)+"%"}}/><b style={{height:(v.paid/maxDay*100)+"%"}}/></div><small>{d.slice(8)}</small></div>)}</div><div className="chart-legend"><span><i/> إجمالي الطلبات</span><span><b/> المحصل</span></div></article>
 <article className="content-card"><div className="report-card-heading"><div><h2>حالة الطلبات</h2><p>توزيع الطلبات حسب مرحلة التنفيذ</p></div></div>
 <div className="report-bars">{Object.entries(statusCounts).sort((a,b)=>b[1]-a[1]).map(([s,n])=><div className="report-bar-row" key={s}><div><span>{orderLabels[s]||s}</span><b>{count(n)}</b></div><i><em style={{width:pct(n,rows.length)+"%"}}/></i></div>)}</div></article>
 </section>
 <section className="reports-grid">
 <article className="content-card"><div className="report-card-heading"><div><h2>أداء الفروع</h2><p>ترتيب الفروع حسب قيمة الطلبات</p></div></div><div className="report-bars">{topBranches.map(b=><div className="report-bar-row" key={b.name}><div><span>{b.name}</span><b>{money(b.value)} · {count(b.orders)} طلب</b></div><i><em style={{width:(b.value/maxBranch*100)+"%"}}/></i></div>)}</div></article>
 <article className="content-card"><div className="report-card-heading"><div><h2>الأصناف الأكثر طلبًا</h2><p>حسب عدد القطع المباعة</p></div></div><div className="report-bars">{topProducts.map(p=><div className="report-bar-row" key={p.name}><div><span>{p.name}</span><b>{count(p.qty)} قطعة · {money(p.value)}</b></div><i><em style={{width:(p.qty/maxProduct*100)+"%"}}/></i></div>)}{!topProducts.length?<p className="empty">لا توجد تفاصيل أصناف.</p>:null}</div></article>
 </section>
 <section className="reports-grid">
 <article className="content-card"><h2>طرق الاستلام ومصدر الطلب</h2><div className="report-stat-list"><div><span>توصيل</span><strong>{count(fulfillCounts.delivery||0)}</strong></div><div><span>استلام من الفرع</span><strong>{count(fulfillCounts.pickup||0)}</strong></div>{Object.entries(sourceCounts).map(([k,v])=><div key={k}><span>{k}</span><strong>{count(v)}</strong></div>)}</div></article>
 <article className="content-card"><h2>حالات الدفع</h2><div className="report-stat-list">{Object.entries(payCounts).map(([s,n])=><div key={s}><span>{payLabels[s]||s}</span><strong>{count(n)} · {pct(n,rows.length)}%</strong></div>)}</div></article>
 </section>
 <section className="content-card">
  <div className="report-card-heading"><div><h2>برنامج ولاء العملاء</h2><p>كل جنيه صافٍ من قيمة الأصناف في طلب مكتمل ومدفوع = نقطة واحدة. لا تُحتسب رسوم التوصيل أو الطلبات الملغاة/المستردة.</p></div><a href="/admin/customers">قاعدة بيانات العملاء ←</a></div>
  <div className="report-stat-list"><div><span>نقاط مكتسبة في الفترة</span><strong>{count(earnedPoints)}</strong></div><div><span>نقاط تم عكسها</span><strong>{count(reversedPoints)}</strong></div><div><span>صافي حركة النقاط</span><strong>{count(loyaltyNet)}</strong></div><div><span>إجمالي الرصيد الحالي</span><strong>{count(pointsOutstanding)}</strong></div></div>
  <div className="table-wrap"><table><thead><tr><th>العميل</th><th>رقم الموبايل</th><th>الرصيد الحالي</th></tr></thead><tbody>
   {(topCustomerResult.data||[]).map(customer=><tr key={customer.id}><td>{customer.full_name}</td><td dir="ltr">{customer.phone}</td><td><strong>{count(Number(customer.points_balance))} نقطة</strong></td></tr>)}
   {!topCustomerResult.data?.length?<tr><td colSpan={3} className="empty">لا توجد أرصدة نقاط حتى الآن.</td></tr>:null}
  </tbody></table></div>
 </section>
 <section className="content-card"><h2>تفاصيل الطلبات</h2><div className="table-wrap"><table><thead><tr><th>رقم</th><th>العميل</th><th>رقم الموبايل</th><th>الفرع</th><th>المصدر</th><th>النوع</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>
 {rows.slice(0,300).map(o=>{const b=Array.isArray(o.branches)?o.branches[0]:o.branches;return <tr key={o.id}><td>#{o.order_number}</td><td>{o.customer_name}</td><td dir="ltr">{o.customer_phone}</td><td>{b?.name_ar||"—"}</td><td>{o.source==="call_center"?"كول سنتر":"الموقع"}</td><td>{o.fulfillment==="delivery"?"توصيل":"استلام"}</td><td>{orderLabels[o.status]||o.status}</td><td>{payLabels[o.payment_status]||o.payment_status}</td><td>{money(Number(o.total))}</td><td>{new Date(o.created_at).toLocaleString("ar-EG")}</td></tr>})}
 {!rows.length?<tr><td colSpan={10} className="empty">لا توجد طلبات في الفترة المحددة.</td></tr>:null}</tbody></table></div><p className="muted">يعرض الجدول أحدث 300 طلب. بيانات الأصناف حتى 50,000 بند ضمن الفترة.</p></section>
 </>:null}</main>;
}
