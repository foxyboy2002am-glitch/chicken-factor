"use client";

import { useEffect, useState } from "react";

const CART_KEY = "cf-store-cart-v1";

export default function CartButton() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => {
      try {
        const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        setCount(Array.isArray(items) ? items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity || 0), 0) : 0);
      } catch { setCount(0); }
    };
    refresh();
    window.addEventListener("cf-cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cf-cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <a className="cf-cart-button" href="/checkout" aria-label={`سلة المشتريات، ${count} منتجات`}>🛒 <span>السلة</span><b>{count}</b></a>;
}
