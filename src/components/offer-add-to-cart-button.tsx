"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { useStoreLanguage } from "@/components/store-language";

type Props = { offerId: string; offerName: string; offerNameEn?: string; price: number };

export default function OfferAddToCartButton({ offerId, offerName, offerNameEn, price }: Props) {
  const { language } = useStoreLanguage();
  const en = language === "en";
  const [added, setAdded] = useState(false);

  function addOffer(event: ReactMouseEvent<HTMLButtonElement>) {
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
          productName: en ? (offerNameEn || offerName) : offerName,
          variantName: "عرض كامل",
          nameAr: offerName,
          nameEn: offerNameEn || offerName,
          variantAr: "عرض كامل",
          variantEn: "Full offer",
          price,
          sku: `OFFER-${offerId}`,
          quantity: 1,
        });
      }
      window.localStorage.setItem(key, JSON.stringify(cart));
      window.dispatchEvent(new Event("cf-cart-updated"));
      const rect = event.currentTarget.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent("cf-cart-fly", { detail: { emoji: "🐔", origin: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } } }));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    } catch (error) {
      console.error("[Chicken Factor cart] Could not add offer:", error);
      window.alert(en ? "Could not add the offer to your cart. Please try again." : "تعذر إضافة العرض للسلة. حاول مرة أخرى.");
    }
  }

  return <button type="button" className={added ? "cf-offer-add is-added" : "cf-offer-add"} onClick={addOffer}>
    {added ? (en ? "Added to cart! ✓" : "العرض في السلة! ✓") : (en ? "Add offer to cart" : "أضف العرض للسلة")}
  </button>;
}
