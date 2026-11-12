"use client";

import { useEffect, useState } from "react";

const CART_KEY = "cf-store-cart-v1";

export default function CartButton() {
  const [count, setCount] = useState(0);
  const [bump, setBump] = useState(false);
  const [fly, setFly] = useState(false);
  useEffect(() => {
    const refresh = () => {
      try {
        const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        setCount(Array.isArray(items) ? items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity || 0), 0) : 0);
      } catch { setCount(0); }
    };
    refresh();
    const animateCart = () => { setBump(true); setFly(true); window.setTimeout(() => setBump(false), 650); window.setTimeout(() => setFly(false), 850); };
    window.addEventListener("cf-cart-updated", refresh);
    window.addEventListener("cf-cart-fly", animateCart);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cf-cart-updated", refresh);
      window.removeEventListener("cf-cart-fly", animateCart);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <a className={bump ? "cf-cart-button is-bumping" : "cf-cart-button"} href="/checkout" aria-label={`سلة المشتريات، ${count} منتجات`}><span className="cf-cart-emoji">🛒</span><span>السلة</span><b>{count}</b>{fly ? <i className="cf-cart-fly">🍗</i> : null}</a>;
}
