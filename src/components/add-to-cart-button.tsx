"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { useStoreLanguage } from "@/components/store-language";

type Props = { productId: string; variantId: string; productName: string; variantName: string; price: number; sku?: string | null };

const CART_KEY = "cf-store-cart-v1";

export default function AddToCartButton(props: Props) {
  const { language } = useStoreLanguage();
  const en = language === "en";
  const [added, setAdded] = useState(false);

  function add(event: ReactMouseEvent<HTMLButtonElement>) {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const cart = Array.isArray(parsed) ? parsed : [];
      const existing = cart.find((item: { variantId?: string; quantity?: number }) => item.variantId === props.variantId);

      if (existing) {
        existing.quantity = Math.min(20, Math.max(1, Number(existing.quantity || 1)) + 1);
      } else {
        cart.push({
          productId: props.productId,
          variantId: props.variantId,
          productName: props.productName,
          variantName: props.variantName,
          price: props.price,
          sku: props.sku || "",
          quantity: 1,
        });
      }

      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event("cf-cart-updated"));
      const rect = event.currentTarget.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent("cf-cart-fly", { detail: { emoji: "🐔", origin: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } } }));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch (error) {
      console.error("[Chicken Factor cart] Could not update cart:", error);
      window.alert(en ? "Could not add this item to your cart. Please check your browser settings and try again." : "تعذر إضافة المنتج للسلة. تأكد من إعدادات المتصفح وحاول مرة أخرى.");
    }
  }

  return (
    <button type="button" className={added ? "cf-add-cart is-added" : "cf-add-cart"} onClick={add} aria-label={en ? `Add ${props.productName} ${props.variantName} to cart` : `أضف ${props.productName} ${props.variantName} إلى السلة`}>
      {added ? (en ? "Added! ✓" : "اتضافت! ✓") : (en ? "🛒 Add to cart" : "🛒 أضف للسلة")}
    </button>
  );
}
