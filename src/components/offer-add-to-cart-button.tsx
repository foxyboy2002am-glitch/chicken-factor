"use client";

import { useState } from "react";
import { useStoreLanguage } from "@/components/store-language";

type Props = { offerId: string; offerName: string; price: number };

export default function OfferAddToCartButton({ offerId, offerName, price }: Props) {
  const { language } = useStoreLanguage();\n  const en = language === "en";\n  const [added, setAdded] = useState(false);

  function addOffer() {
    try {
      const key = "cf-store-cart-v1";
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const cart: Array<Record<string, unknown>> = Array.isArray(parsed) ? parsed : [];
      const existing = cart.find((item) => item.offerId === offerId);
      if (existing) {
        existing.quantity = Math.min(20, Math.max(1, Number(existing.quantity || 1)) + 1);
      } else {
        cart.push({
          offerId,
          productId: "",
          variantId: "",
          productName: offerName,
          variantName: "عرض كامل",
          price,
          sku: `OFFER-${offerId}`,
          quantity: 1,
        });
      }
      window.localStorage.setItem(key, JSON.stringify(cart));
      window.dispatchEvent(new Event("cf-cart-updated"));
      window.dispatchEvent(new CustomEvent("cf-cart-fly", { detail: { emoji: "🍗" } }));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch (error) {
      console.error("[Chicken Factor cart] Could not add offer:", error);
      window.alert(en ? "Could not add the offer to your cart. Please try again." : "تعذر إضافة العرض للسلة. حاول مرة أخرى.");
    }
  }

  return <button type="button" className={added ? "cf-offer-add is-added" : "cf-offer-add"} onClick={addOffer}>
    {added ? (en ? "Added to cart! ✓" : "العرض في السلة! ✓") : (en ? "🛒 Add offer to cart" : "🛒 أضف العرض للسلة")}
  </button>;
}
