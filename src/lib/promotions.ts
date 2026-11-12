export const promotions = [
  { id: "friends-625", title: "عرض الصحاب", nameEn: "Friends Meal", price: 625, image: "/offers/friends-625.webp", description: "11 قطعة دجاج + 6 خبز + كولسلو + ثومية + بطاطس", descriptionEn: "11 chicken pieces + 6 buns + coleslaw + garlic sauce + fries" },
  { id: "rizo-150", title: "عرض الريزو", nameEn: "Rizo Offer", price: 150, image: "/offers/rizo-150.webp", description: "2 طبق ريزو", descriptionEn: "2 Rizo bowls" },
  { id: "control-199", title: "عرض السيطرة", nameEn: "Control Offer", price: 199, image: "/offers/control-199.webp", description: "1 تشيكن كلاسيك سنجل + 1 توستر رول سنجل", descriptionEn: "1 Chicken Classic single + 1 Toaster Roll single" },
  { id: "mix-6-525", title: "عرض ميكس 6", nameEn: "Mix 6 Offer", price: 525, image: "/offers/mix-6-525.webp", description: "6 قطع دجاج + 6 قطع استربس + كولسلو + ثومية + بطاطس + 6 خبز", descriptionEn: "6 chicken pieces + 6 strips + coleslaw + garlic sauce + fries + 6 buns" },
] as const;

export type Promotion = (typeof promotions)[number];
export function getPromotion(id: string) {
  return promotions.find((promotion) => promotion.id === id) ?? null;
}
