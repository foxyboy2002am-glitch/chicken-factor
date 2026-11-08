"use client";

type Props = { productId: string; variantId: string; productName: string; variantName: string; price: number; sku?: string | null };

export default function AddToCartButton(props: Props) {
  function add() {
    try {
      const key = "cf-store-cart-v1";
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      const existing = cart.find((item: { variantId: string }) => item.variantId === props.variantId);
      if (existing) existing.quantity = Math.min(20, Number(existing.quantity || 1) + 1);
      else cart.push({ productId: props.productId, variantId: props.variantId, productName: props.productName, variantName: props.variantName, price: props.price, sku: props.sku || "", quantity: 1 });
      localStorage.setItem(key, JSON.stringify(cart));
      window.dispatchEvent(new Event("cf-cart-updated"));
    } catch {
      alert("تعذر إضافة المنتج للسلة. حاول مرة أخرى.");
      return;
    }
    const button = document.activeElement as HTMLButtonElement | null;
    if (button) {
      const old = button.textContent;
      button.textContent = "تمت الإضافة ✓";
      window.setTimeout(() => { if (button.isConnected) button.textContent = old || "أضف للسلة"; }, 1200);
    }
  }
  return <button type="button" className="cf-add-cart" onClick={add}>أضف للسلة</button>;
}
