"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OfferAddToCartButton from "@/components/offer-add-to-cart-button";
import { useStoreLanguage } from "@/components/store-language";

type Offer = {
  id: string;
  title: string;
  nameEn: string;
  price: number;
  image: string;
  description: string;
  descriptionEn: string;
};

export default function OffersCarousel({ offers }: { offers: readonly Offer[] }) {
  const { language } = useStoreLanguage();
  const en = language === "en";
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>(".cf-offer-slide"));
    if (!cards.length) return;
    const next = (index + cards.length) % cards.length;
    track.scrollTo({ left: cards[next].offsetLeft - track.offsetLeft, behavior: "smooth" });
    setActive(next);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".cf-offer-slide"));
      if (!cards.length) return;
      const anchor = track.scrollLeft + 12;
      let closest = 0;
      let distance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const current = Math.abs(card.offsetLeft - track.offsetLeft - anchor);
        if (current < distance) { distance = current; closest = index; }
      });
      setActive(closest);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || offers.length < 2) return;
    const timer = window.setInterval(() => goTo(active + 1), 5200);
    return () => window.clearInterval(timer);
  }, [active, goTo, offers.length, paused]);

  return (
    <div className="cf-offers-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="cf-offers-toolbar">
        <span>{en ? "SWIPE TO EXPLORE" : "اسحب لاكتشاف العروض"}</span>
      </div>
      <div className="cf-offers-controls" aria-label={en ? "Offer navigation" : "التنقل بين العروض"}>
        <button type="button" onClick={() => goTo(active + 1)} aria-label={en ? "Next offer" : "العرض التالي"}>›</button>
        <button type="button" onClick={() => goTo(active - 1)} aria-label={en ? "Previous offer" : "العرض السابق"}>‹</button>
      </div>
      <div className="cf-offers-track" ref={trackRef} dir="ltr" onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
        {offers.map((offer, index) => (
          <article className="cf-offer-slide" key={offer.id}>
            <div className="cf-offer-image-wrap">
              <img src={offer.image} alt={en ? offer.nameEn : offer.title} loading={index < 2 ? "eager" : "lazy"} />
              <span className="cf-offer-ribbon">{en ? "LIMITED OFFER" : "عرض لفترة محدودة"}</span>
              <strong className="cf-offer-price">{offer.price.toLocaleString(en ? "en-EG" : "ar-EG")} <small>{en ? "EGP" : "جنيه"}</small></strong>
            </div>
            <div className="cf-offer-info" dir={en ? "ltr" : "rtl"}>
              <div className="cf-offer-copy">
                <h3>{en ? offer.nameEn : offer.title}</h3>
                <p>{en ? offer.descriptionEn : offer.description}</p>
              </div>
              <OfferAddToCartButton offerId={offer.id} offerName={offer.title} offerNameEn={offer.nameEn} price={offer.price} />
            </div>
          </article>
        ))}
      </div>
      <div className="cf-offers-pagination" aria-label={en ? "Offer slides" : "صفحات العروض"}>
        {offers.map((offer, index) => <button key={offer.id} type="button" className={active === index ? "is-active" : ""} onClick={() => goTo(index)} aria-label={en ? `Go to offer ${index + 1}` : `انتقل للعرض ${index + 1}`} />)}
      </div>
    </div>
  );
}
