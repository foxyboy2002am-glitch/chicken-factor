import { signIn } from "@/app/actions/auth";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const message =
    error === "invalid" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." :
    error === "missing" ? "من فضلك أدخل البريد الإلكتروني وكلمة المرور." :
    error === "unauthorized" ? "هذا الحساب ليس لديه صلاحية دخول لوحة الإدارة." : "";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">CF</div>
        <p className="eyebrow">CHICKEN FACTOR</p>
        <h1>تسجيل دخول الإدارة</h1>
        <p className="muted">سجّل الدخول لإدارة المطعم والفروع والطلبات.</p>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <form action={signIn} className="auth-form">
          <label htmlFor="email">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">كلمة المرور</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">تسجيل الدخول</button>
        </form>
        <p className="muted small">لوحة إدارة Chicken Factor · وصول مصرح به فقط</p>
      </section>
    </main>
  );
}
