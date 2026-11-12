"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type StoreLanguage = "ar" | "en";
const LanguageContext = createContext<{ language: StoreLanguage; setLanguage: (language: StoreLanguage) => void }>({
  language: "ar",
  setLanguage: () => {},
});

export function StoreLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<StoreLanguage>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem("cf-store-language");
    if (saved === "en" || saved === "ar") setLanguage(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.dataset.storeLanguage = language;
    document.querySelectorAll<HTMLElement>("[data-ar][data-en]").forEach((node) => {
      node.textContent = language === "en" ? node.dataset.en ?? "" : node.dataset.ar ?? "";
    });
    document.querySelectorAll<HTMLElement>("[data-placeholder-ar][data-placeholder-en]").forEach((node) => {
      if (node instanceof HTMLInputElement) node.placeholder = language === "en" ? node.dataset.placeholderEn ?? "" : node.dataset.placeholderAr ?? "";
    });
    window.localStorage.setItem("cf-store-language", language);
    window.dispatchEvent(new CustomEvent("cf-store-language-change", { detail: language }));
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useStoreLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useStoreLanguage();
  const next = language === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      className="store-language-switch"
      aria-label={language === "ar" ? "Switch language to English" : "تغيير اللغة إلى العربية"}
      aria-pressed={language === "en"}
      onClick={() => setLanguage(next)}
      title={language === "ar" ? "English" : "العربية"}
    >
      {language === "ar" ? "AR" : "EN"}
    </button>
  );
}
