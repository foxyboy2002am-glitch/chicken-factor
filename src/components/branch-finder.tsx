"use client";

import { useEffect, useMemo, useState } from "react";

type Branch = { name:string; address:string; city:string; lat:number; lng:number };
const branches:Branch[] = [
 {name:"فرع الزقازيق 1",city:"الزقازيق",address:"شارع الجلاء - أمام عمر أفندي وسط البلد قبل عالم ماركت",lat:30.5877,lng:31.5020},
 {name:"فرع الزقازيق 2",city:"الزقازيق",address:"شارع صلاح سالم - داخل كوزاكي",lat:30.5890,lng:31.5080},
 {name:"فرع أبو حماد",city:"أبو حماد",address:"أمام كوبري الساحة",lat:30.5450,lng:31.6750},
 {name:"فرع بلبيس",city:"بلبيس",address:"محلات الساحة الشعبية بجوار مستشفى الغندور",lat:30.4200,lng:31.5650},
 {name:"فرع ديرب نجم",city:"ديرب نجم",address:"شارع النصر - أمام موقف الزقازيق - بجوار مجمع نصر عابدين",lat:30.7540,lng:31.4400},
 {name:"فرع منيا القمح",city:"منيا القمح",address:"برج الفتح - شارع وجيه أباظة - أمام قاعة البطل",lat:30.5070,lng:31.3750},
 {name:"فرع ههيا",city:"ههيا",address:"طريق أبو كبير بجوار المستشفى العام",lat:30.6710,lng:31.5880},
 {name:"فرع القرين",city:"القرين",address:"ميدان الشيخ حمادة",lat:30.6160,lng:31.7350},
 {name:"فرع التل الكبير",city:"التل الكبير",address:"شارع حماده - عمارة الأوقاف",lat:30.5440,lng:32.1420},
 {name:"فرع السنبلاوين",city:"السنبلاوين",address:"شارع المشاية - أرض الملج",lat:31.4620,lng:31.0500},
 {name:"فرع طنطا",city:"طنطا",address:"شارع الاستاد",lat:30.7860,lng:31.0000},
];
const distance=(a:number,b:number,c:number,d:number)=>{const r=6371,rad=(x:number)=>x*Math.PI/180,dl=rad(c-a),dn=rad(d-b),v=Math.sin(dl/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dn/2)**2;return 2*r*Math.asin(Math.sqrt(v))};
function mapsUrl(b:Branch){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(b.name+"، "+b.address+"، "+b.city+"، مصر")}
export default function BranchFinder(){
 const [position,setPosition]=useState<{lat:number;lng:number}|null>(null);
 const [status,setStatus]=useState<"loading"|"ready"|"denied"|"unsupported">("loading");
 useEffect(()=>{
  if(!("geolocation" in navigator)){setStatus("unsupported");return}
  navigator.geolocation.getCurrentPosition(
   p=>{setPosition({lat:p.coords.latitude,lng:p.coords.longitude});setStatus("ready")},
   ()=>setStatus("denied"),
   {enableHighAccuracy:true,timeout:9000,maximumAge:300000}
  );
 },[]);
 const sorted=useMemo(()=>position?[...branches].sort((a,b)=>distance(position.lat,position.lng,a.lat,a.lng)-distance(position.lat,position.lng,b.lat,b.lng)):branches,[position]);
 const nearest=sorted[0];
 return <div className="branch-finder">
  <div className="branch-location-status" aria-live="polite">
   <span className="branch-location-pin">⌖</span>
   <div><strong>{status==="ready"?"أقرب فرع ليك":status==="loading"?"بندور على أقرب فرع ليك…":"حدد موقعك عشان نرشحلك أقرب فرع"}</strong>
   <small>{status==="ready"?"حسب موقع جهازك — المسافة تقديرية حتى تأكيد نقطة الفرع على الخريطة":status==="loading"?"اسمح للموقع بالوصول لمكانك":"تقدر تفتح الخريطة لأي فرع وتشوف الاتجاهات"}</small></div>
   {status==="ready"&&<a href={mapsUrl(nearest)} target="_blank" rel="noopener noreferrer">الاتجاهات</a>}
   {status!=="ready"&&<button type="button" onClick={()=>{setStatus("loading");navigator.geolocation?.getCurrentPosition(p=>{setPosition({lat:p.coords.latitude,lng:p.coords.longitude});setStatus("ready")},()=>setStatus("denied"),{enableHighAccuracy:true,timeout:9000,maximumAge:300000})}}>حدد موقعي</button>}
  </div>
  {status==="ready"&&<div className="branch-nearest-highlight"><b>{nearest.name}</b><span>{nearest.address}</span><strong>حوالي {distance(position!.lat,position!.lng,nearest.lat,nearest.lng).toFixed(1)} كم من موقعك</strong></div>}
  <div className="branches-address-grid">
   {sorted.map((b,i)=><article className={"store-branch-card branches-address-card"+(status==="ready"&&i===0?" is-nearest":"")} key={b.name}>
    <span className="branch-number">{String(i+1).padStart(2,"0")}</span>
    {status==="ready"&&i===0&&<span className="branch-nearest-tag">الأقرب ليك</span>}
    <h2>{b.name}</h2><p>{b.address}</p>
    <div className="branch-card-actions"><a href={mapsUrl(b)} target="_blank" rel="noopener noreferrer"> <span aria-hidden="true">📍</span> اللوكيشن والاتجاهات</a><a href="tel:15407">اتصل 15407</a></div>
   </article>)}
  </div>
 </div>;
}
