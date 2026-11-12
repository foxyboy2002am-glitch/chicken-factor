"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AutoRefresh({intervalMs=20000}:{intervalMs?:number}){
 const router=useRouter();
 useEffect(()=>{const id=window.setInterval(()=>router.refresh(),intervalMs);return()=>window.clearInterval(id)},[router,intervalMs]);
 return <span className="live-indicator"><i/> تحديث تلقائي كل {Math.round(intervalMs/1000)} ثانية</span>;
}
