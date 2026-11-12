"use client";
import { useMemo, useState } from "react";
import { createCallCenterOrder } from "@/app/actions/orders";

type Branch={id:string;name_ar:string};
type Variant={id:string;name_ar:string;name_en:string;base_price:number|string;products:{name_ar:string}|{name_ar:string}[]|null};
export default function CallCenterEntry({branches,variants}:{branches:Branch[];variants:Variant[]}) {
  const [fulfillment,setFulfillment]=useState("delivery");
  const [items,setItems]=useState([{variant_id:"",quantity:1}]);
  const total=useMemo(()=>items.reduce((sum,item)=>{const v=variants.find(x=>x.id===item.variant_id);return sum+(Number(v?.base_price||0)*item.quantity)},0),[items,variants]);
  const update=(i:number,key:"variant_id"|"quantity",value:string)=>setItems(old=>old.map((x,n)=>n===i?{...x,[key]:key==="quantity"?Math.max(1,Math.min(20,Number(value)||1)):value}:x));
  const productName=(v:Variant)=>Array.isArray(v.products)?v.products[0]?.name_ar:v.products?.name_ar;
  return <form action={createCallCenterOrder} className="data-form cc-entry">
    <div className="form-divider">بيانات العميل والطلب</div>
    <label>اسم العميل<input name="customer_name" required minLength={2}/></label>
    <label>رقم الهاتف<input name="customer_phone" required inputMode="tel" minLength={10}/></label>
    <label>نوع الطلب<select name="fulfillment" value={fulfillment} onChange={e=>setFulfillment(e.target.value)}><option value="delivery">توصيل</option><option value="pickup">استلام من الفرع</option></select></label>
    <label>الفرع المسؤول<select name="branch_id" required defaultValue=""><option value="" disabled>اختر الفرع</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></label>
    {fulfillment==="delivery"?<>
      <label>المنطقة<input name="area" required/></label><label>الشارع<input name="street" required/></label>
      <label>رقم المبنى<input name="building"/></label><label>الدور<input name="floor"/></label>
      <label className="cc-wide">علامة مميزة<input name="landmark"/></label>
    </>:null}
    <div className="form-divider">الأصناف والكميات</div>
    {items.map((item,i)=><div className="cc-item" key={i}>
      <label>الصنف<select value={item.variant_id} onChange={e=>update(i,"variant_id",e.target.value)} required>
        <option value="">اختر الصنف</option>{variants.map(v=><option key={v.id} value={v.id}>{productName(v)} — {v.name_ar} ({Number(v.base_price).toFixed(2)} ج)</option>)}
      </select></label>
      <label>الكمية<input type="number" min="1" max="20" value={item.quantity} onChange={e=>update(i,"quantity",e.target.value)}/></label>
      <button type="button" className="cc-remove" disabled={items.length===1} onClick={()=>setItems(old=>old.filter((_,n)=>n!==i))}>حذف</button>
    </div>)}
    <button type="button" className="secondary-button" onClick={()=>setItems(old=>old.length<30?[...old,{variant_id:"",quantity:1}]:old)}>+ إضافة صنف</button>
    <input type="hidden" name="items_json" value={JSON.stringify(items.filter(x=>x.variant_id))}/>
    <label className="cc-wide">ملاحظات الطلب<textarea name="notes" rows={2}/></label>
    <div className="cc-total">إجمالي تقديري للأصناف: <strong>{new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP"}).format(total)}</strong><small>السعر النهائي يعاد احتسابه من قاعدة البيانات عند الحفظ.</small></div>
    <button type="submit" disabled={!branches.length||!variants.length||!items.some(x=>x.variant_id)}>تسجيل الطلب وإرساله للفرع</button>
  </form>;
}
