import { createOffer, updateOffer, toggleOffer } from "@/app/actions/offers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function discountLabel(type: string, value: number) {
  return type === "percentage" ? `${value}% خصم` : `${new Intl.NumberFormat("ar-EG").format(value)} جنيه خصم`;
}

export default async function OffersPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: offers, error } = await supabase.from("offers")
    .select("id, name_ar, name_en, description_ar, description_en, discount_type, discount_value, starts_at, ends_at, is_active, created_at")
    .order("created_at", { ascending: false });

  const messages: Record<string, string> = {
    validation: "راجع البيانات المطلوبة وتأكد من صحة القيم.",
    discount: "نسبة الخصم لا يمكن أن تتجاوز 100%.",
    dates: "تاريخ انتهاء العرض يجب أن يكون بعد تاريخ البداية.",
    save: "تعذر حفظ العرض. راجع البيانات أو صلاحيات قاعدة البيانات.",
    update: "تعذر تعديل العرض.",
  };

  return (
    <main className="dashboard-content" dir="rtl">
      <div className="page-heading">
        <div><p className="eyebrow">OFFERS & DISCOUNTS</p><h1>العروض والخصومات</h1><p className="muted">إنشاء العروض وتحديد قيمة الخصم وفترة سريانه.</p></div>
      </div>
      {params.success ? <p className="notice success">تم حفظ التغييرات بنجاح.</p> : null}
      {params.error || error ? <p className="notice error">{messages[params.error || ""] || "تعذر تحميل العروض. راجع صلاحيات الوصول."}</p> : null}

      <section className="content-card">
        <h2>إضافة عرض جديد</h2>
        <form action={createOffer} className="data-form">
          <label>اسم العرض بالعربي<input name="name_ar" required minLength={2} /></label>
          <label>اسم العرض بالإنجليزي<input name="name_en" required minLength={2} /></label>
          <label>وصف العرض بالعربي<input name="description_ar" /></label>
          <label>وصف العرض بالإنجليزي<input name="description_en" /></label>
          <label>نوع الخصم<select name="discount_type" defaultValue="percentage"><option value="percentage">نسبة مئوية %</option><option value="fixed">مبلغ ثابت بالجنيه</option></select></label>
          <label>قيمة الخصم<input name="discount_value" type="number" min="0.01" max="100000" step="0.01" required /></label>
          <label>بداية العرض<input name="starts_at" type="datetime-local" required /></label>
          <label>نهاية العرض<input name="ends_at" type="datetime-local" required /></label>
          <label>الحالة<select name="is_active" defaultValue="true"><option value="true">نشط</option><option value="false">متوقف</option></select></label>
          <button type="submit">حفظ العرض</button>
        </form>
      </section>

      <section className="content-card">
        <h2>العروض المسجلة <span className="count">{offers?.length ?? 0}</span></h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>العرض</th><th>الخصم</th><th>بداية العرض</th><th>النهاية</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {offers?.map((offer) => (
                <tr key={offer.id}>
                  <td>{offer.name_ar}<small>{offer.name_en}</small></td>
                  <td>{discountLabel(offer.discount_type, Number(offer.discount_value))}</td>
                  <td>{new Date(offer.starts_at).toLocaleString("ar-EG")}</td>
                  <td>{new Date(offer.ends_at).toLocaleString("ar-EG")}</td>
                  <td>{offer.is_active ? "نشط" : "متوقف"}</td>
                  <td>
                    <details>
                      <summary>تعديل</summary>
                      <form action={updateOffer} className="data-form">
                        <input type="hidden" name="offer_id" value={offer.id} />
                        <label>اسم العرض بالعربي<input name="name_ar" defaultValue={offer.name_ar} required /></label>
                        <label>اسم العرض بالإنجليزي<input name="name_en" defaultValue={offer.name_en} required /></label>
                        <label>الوصف بالعربي<input name="description_ar" defaultValue={offer.description_ar || ""} /></label>
                        <label>الوصف بالإنجليزي<input name="description_en" defaultValue={offer.description_en || ""} /></label>
                        <label>نوع الخصم<select name="discount_type" defaultValue={offer.discount_type}><option value="percentage">نسبة مئوية %</option><option value="fixed">مبلغ ثابت بالجنيه</option></select></label>
                        <label>قيمة الخصم<input name="discount_value" type="number" min="0.01" step="0.01" defaultValue={Number(offer.discount_value)} required /></label>
                        <label>بداية العرض<input name="starts_at" type="datetime-local" defaultValue={localDateTime(offer.starts_at)} required /></label>
                        <label>نهاية العرض<input name="ends_at" type="datetime-local" defaultValue={localDateTime(offer.ends_at)} required /></label>
                        <label>الحالة<select name="is_active" defaultValue={String(offer.is_active)}><option value="true">نشط</option><option value="false">متوقف</option></select></label>
                        <button type="submit">حفظ التعديل</button>
                      </form>
                    </details>
                    <form action={toggleOffer}>
                      <input type="hidden" name="offer_id" value={offer.id} />
                      <input type="hidden" name="is_active" value={String(!offer.is_active)} />
                      <button type="submit" className="secondary-button">{offer.is_active ? "إيقاف" : "تفعيل"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!offers?.length && !error ? <tr><td colSpan={6} className="empty">لا توجد عروض حتى الآن. أضف أول عرض من النموذج أعلاه.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
