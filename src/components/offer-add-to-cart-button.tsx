"use client";

import { useState } from "react";

type Props = { offerId: string; offerName: string; price: number };

export default function OfferAddToCartButton({ offerId, offerName, price }: Props) {
  const [added, setAdded] = useState(false);

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
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch (error) {
      console.error("[Chicken Factor cart] Could not add offer:", error);
      window.alert("تعذر إضافة العرض للسلة. حاول مرة أخرى.");
    }
  }

  return <button type="button" className={added ? "cf-offer-add is-added" : "cf-offer-add"} onClick={addOffer}>
    {added ? "اتضاف العرض للسلة ✓" : "＋ أضف العرض للسلة"}
  </button>;
}
