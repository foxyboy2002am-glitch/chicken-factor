"use client";
import {useEffect,useMemo,useState} from "react";
const KEY="cf-store-cart-v1";
type Item={productId?:string;variantId?:string;offerId?:string;productName:string;variantName?:string;price:number|string;quantity:number;sku?:string};
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(n);
function read():Item[]{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x.filter(i=>i&&typeof i.productName==="string"&&Number(i.quantity)>0):[]}catch{return[]}}
export default function CartButton(){
 const [items,setItems]=useState<Item[]>([]),[open,setOpen]=useState(false),[bump,setBump]=useState(false),[fly,setFly]=useState(false);
 useEffect(()=>{const refresh=()=>setItems(read());const animate=()=>{setBump(true);setFly(true);window.setTimeout(()=>setBump(false),550);window.setTimeout(()=>setFly(false),800)};refresh();window.addEventListener("cf-cart-updated",refresh);window.addEventListener("cf-cart-fly",animate);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("cf-cart-updated",refresh);window.removeEventListener("cf-cart-fly",animate);window.removeEventListener("storage",refresh)}},[]);
 const count=items.reduce((s,x)=>s+Number(x.quantity||0),0),total=items.reduce((s,x)=>s+Number(x.price||0)*Number(x.quantity||0),0);
 const save=(next:Item[])=>{setItems(next);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event("cf-cart-updated"))};
 const change=(i:number,d:number)=>save(items.map((x,n)=>n===i?{...x,quantity:Math.max(1,Math.min(20,x.quantity+d))}:x));
 const remove=(i:number)=>save(items.filter((_,n)=>n!==i));
 return <div className="cf-floating-cart" dir="rtl">
 {open?<><button className="cf-cart-backdrop" aria-label="إغلاق السلة" onClick={()=>setOpen(false)}/><section className="cf-cart-panel" aria-label="سلة المشتريات">
 <header className="cf-cart-panel-head"><div><span>YOUR ORDER</span><h3>سلتك جاهزة؟ 🍗</h3><small>{count} قطعة في السلة</small></div><button onClick={()=>setOpen(false)} aria-label="إغلاق">×</button></header>
 <div className="cf-cart-items">{items.length?items.map((item,i)=><article className="cf-cart-line" key={item.offerId||item.variantId||i}><div className="cf-cart-thumb">🍗</div><div className="cf-cart-line-info"><strong>{item.productName}</strong><small>{item.variantName||"عرض كامل"}</small><b>{money(Number(item.price))}</b><div className="cf-cart-qty"><button onClick={()=>change(i,-1)} disabled={item.quantity<=1}>−</button><span>{item.quantity}</span><button onClick={()=>change(i,1)} disabled={item.quantity>=20}>+</button><button className="cf-cart-remove" onClick={()=>remove(i)}>حذف</button></div></div><strong className="cf-cart-line-total">{money(Number(item.price)*item.quantity)}</strong></article>):<div className="cf-cart-empty"><span>🛒</span><strong>السلة لسه فاضية</strong><small>اختار وجبتك المفضلة وإحنا جاهزين!</small></div>}</div>
 <footer className="cf-cart-panel-foot"><div><span>الإجمالي المبدئي</span><strong>{money(total)}</strong></div><small>رسوم التوصيل والخصومات تُحسب عند إتمام الطلب.</small><a className={items.length?"":"is-disabled"} href={items.length?"/checkout":"#menu-categories"} onClick={e=>{if(!items.length){e.preventDefault();setOpen(false)}}}>إتمام الطلب <span>←</span></a></footer></section></>:null}
 <button className={`cf-floating-cart-trigger ${bump?"is-bumping":""}`} onClick={()=>setOpen(v=>!v)} aria-label={`فتح السلة، ${count} قطعة`}><span className="cf-cart-trigger-icon">🛒</span><span className="cf-cart-trigger-copy"><b>سلتك</b><small>{count?money(total):"اختار وجبتك"}</small></span><b className="cf-cart-count">{count}</b>{fly?<i className="cf-cart-fly">🍗</i>:null}</button>
 </div>;
}
