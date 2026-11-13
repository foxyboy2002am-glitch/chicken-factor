import { StoreLanguageProvider, LanguageSwitcher } from "@/components/store-language";
import CartButton from "@/components/cart-button";

const branches = [
  { name: "فرع الزقازيق 1", address: "شارع الجلاء - أمام عمر أفندي وسط البلد قبل عالم ماركت" },
  { name: "فرع الزقازيق 2", address: "شارع صلاح سالم - داخل كوزاكي" },
  { name: "فرع أبو حماد", address: "أمام كوبري الساحة" },
  { name: "فرع بلبيس", address: "محلات الساحة الشعبية بجوار مستشفى الغندور" },
  { name: "فرع ديرب نجم", address: "شارع النصر - أمام موقف الزقازيق - بجوار مجمع نصر عابدين" },
  { name: "فرع منيا القمح", address: "برج الفتح - شارع وجيه أباظة - أمام قاعة البطل" },
  { name: "فرع ههيا", address: "طريق أبو كبير بجوار المستشفى العام" },
  { name: "فرع القرين", address: "ميدان الشيخ حمادة" },
  { name: "فرع التل الكبير", address: "شارع حماده - عمارة الأوقاف" },
  { name: "فرع السنبلاوين", address: "شارع المشاية - أرض الملج" },
  { name: "فرع طنطا", address: "شارع الاستاد" },
];
const comingSoon = ["العاشر من رمضان", "أبو كبير", "الإسماعيلية", "العباسية"];

export default function BranchesPage() {
  return (
    <StoreLanguageProvider>
      <main className="store-page branches-page">
        <header className="store-header">
          <a className="store-logo" href="/menu" aria-label="Chicken Factor - الصفحة الرئيسية">
            <img src="/profile_chicken_factor.webp" alt="Chicken Factor" />
            <b>CHICKEN FACTOR</b>
          </a>
          <nav className="store-main-nav" aria-label="التنقل الرئيسي">
            <a href="/menu" data-ar="المنيو" data-en="Menu">المنيو</a>
            <a href="/menu#offers" data-ar="العروض" data-en="Offers">العروض</a>
            <a href="/branches" data-ar="الفروع" data-en="Branches">الفروع</a>
            <span className="store-header-social" aria-label="تابعنا على السوشيال ميديا">
              <a className="store-header-social-link" href="https://www.facebook.com/Chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.6V13h2.7v8h3.2Z"/></svg></a>
              <a className="store-header-social-link" href="https://www.instagram.com/chickennfactor/?hl=ar" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.7" r=".9" className="social-icon-fill"/></svg></a>
              <a className="store-header-social-link" href="https://www.tiktok.com/tag/chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h3c.2 1.8 1.2 3.1 3 3.7v3.1a8 8 0 0 1-3-1v5.7a6.2 6.2 0 1 1-6.2-6.2c.4 0 .8 0 1.2.1v3.2a3.1 3.1 0 1 0 1.9 2.9V3Z"/></svg></a>
            </span>
          </nav>
          <div className="store-header-actions"><LanguageSwitcher /><CartButton /><a className="store-hotline" href="tel:15407"><span data-ar="الخط الساخن" data-en="Hotline">الخط الساخن</span> <strong>15407</strong></a></div>
        </header>

        <section className="store-branches branches-directory" aria-labelledby="branches-title">
          <div className="store-branches-heading">
            <span>OUR LOCATIONS</span>
            <h1 id="branches-title" data-ar="فروع تشيكن فاكتور" data-en="Chicken Factor branches">فروع تشيكن فاكتور</h1>
            <p data-ar="اختار أقرب فرع ليك واعرف عنوانه بالتفصيل" data-en="Find your nearest branch and its full address">اختار أقرب فرع ليك واعرف عنوانه بالتفصيل</p>
          </div>
          <div className="branches-address-grid">
            {branches.map((branch, index) => (
              <article className="store-branch-card branches-address-card" key={branch.name}>
                <span className="branch-number">{String(index + 1).padStart(2, "0")}</span>
                <h2>{branch.name}</h2>
                <p>{branch.address}</p>
                <a href="tel:15407">للطلب اتصل 15407</a>
              </article>
            ))}
          </div>
          <div className="branches-coming-soon">
            <h2 data-ar="فروع قريباً" data-en="Coming soon">فروع قريباً</h2>
            <div>{comingSoon.map((name) => <span key={name}>{name}</span>)}</div>
          </div>
        </section>

        <footer className="store-footer">
          <img src="/profile_chicken_factor.webp" alt="" />
          <b>CHICKEN FACTOR</b>
          <span data-ar="فراخنا من إنتاج مزارعنا" data-en="Our chicken comes from our own farms">فراخنا من إنتاج مزارعنا</span>
          <span data-ar="للطلب والاستفسار" data-en="For orders and enquiries">للطلب والاستفسار</span>
          <a href="tel:15407">15407</a>
          <nav className="store-social-links" aria-label="تابع تشيكن فاكتور">
            <span data-ar="تابعنا على" data-en="Follow us">تابعنا على</span>
            <a href="https://www.facebook.com/Chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a>
            <a href="https://www.instagram.com/chickennfactor/?hl=ar" target="_blank" rel="noopener noreferrer" aria-label="Instagram">◎</a>
            <a href="https://www.tiktok.com/tag/chickenfactor" target="_blank" rel="noopener noreferrer" aria-label="TikTok">♪</a>
          </nav>
          <div className="store-copyright" dir="ltr">© 2026 Wonder Tech. All rights reserved.</div>
        </footer>
      </main>
    </StoreLanguageProvider>
  );
}
