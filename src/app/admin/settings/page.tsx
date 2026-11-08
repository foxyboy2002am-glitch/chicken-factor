import { updatePaymentMethods } from "@/app/actions/payment-settings";
import { updateStoreContactSettings } from "@/app/actions/store-contact";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: methods, error }, { data: contact }] = await Promise.all([
    supabase.from("payment_method_settings").select("code,name_ar,description_ar,is_enabled").order("sort_order"),
    supabase.from("store_contact_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
  ]);
  const cash = methods?.find(m => m.code === "cash");
  const paymob = methods?.find(m => m.code === "paymob");
  return <main className="dashboard-content" dir="rtl">
    <div className="page-heading"><div><p className="eyebrow">STORE SETTINGS</p><h1>إعدادات المتجر وطرق الدفع</h1><p className="muted">تحكم في طرق الدفع الظاهرة للعملاء. بيانات البطاقات لا يتم تخزينها في موقعك.</p></div></div>
    {params.success ? <p className="notice success">تم حفظ الإعدادات.</p> : null}
    {params.error || error ? <p className="notice error">تعذر تحميل أو حفظ الإعدادات. تأكد من تطبيق إعدادات قاعدة البيانات.</p> : null}
    <section className="content-card">
      <h2>طرق الدفع المتاحة</h2>
      <form action={updatePaymentMethods} className="data-form">
        <div className="form-divider">الدفع النقدي عند الاستلام</div>
        <label>تفعيل الدفع النقدي<select name="cash_enabled" defaultValue={String(cash?.is_enabled ?? true)}><option value="true">مفعل</option><option value="false">متوقف</option></select></label>
        <label>اسم الطريقة بالعربي<input name="cash_name_ar" defaultValue={cash?.name_ar ?? "الدفع كاش عند الاستلام"} required /></label>
        <label>وصف يظهر للعميل<input name="cash_description_ar" defaultValue={cash?.description_ar ?? "ادفع نقدًا عند استلام الطلب"} /></label>
        <div className="form-divider">فيزا / ماستركارد عبر Paymob</div>
        <label>تفعيل الدفع بالبطاقة<select name="paymob_enabled" defaultValue={String(paymob?.is_enabled ?? false)}><option value="true">مفعل</option><option value="false">متوقف</option></select></label>
        <label>اسم طريقة الدفع<input name="paymob_name_ar" defaultValue={paymob?.name_ar ?? "فيزا / ماستركارد"} required /></label>
        <label>وصف يظهر للعميل<input name="paymob_description_ar" defaultValue={paymob?.description_ar ?? "الدفع الإلكتروني الآمن عبر Paymob"} /></label>
        <p className="muted">ملاحظة: تفعيل الخيار هنا يعرض وسيلة الدفع في لوحة الإعدادات فقط. ربط بوابة Paymob يحتاج مفاتيح API السرية في إعدادات السيرفر، ولا نضعها في الواجهة أو نخزن أرقام البطاقات.</p>
        <button type="submit">حفظ طرق الدفع</button>
      </form>
    </section>
  </main>;
}
