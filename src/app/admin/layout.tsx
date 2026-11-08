import { requireAdmin } from "@/lib/auth/require-admin";
import { signOut } from "@/app/actions/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireAdmin();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span>CF</span><div><strong>Chicken Factor</strong><small>Management</small></div></div>
        <nav aria-label="القائمة الرئيسية">
          <a className="nav-active" href="/admin">نظرة عامة</a>
          <a href="/admin/branches">الفروع</a>
          <a href="/admin/products">المنتجات والمنيو</a>
          <a href="/admin/offers">العروض والخصومات</a>
          <a href="/admin/orders">الطلبات</a>
          <a href="/admin/reports">التقارير</a>
          <a href="/admin/settings">الإعدادات</a>
        </nav>
        <form action={signOut}><button className="signout" type="submit">تسجيل الخروج</button></form>
      </aside>
      <section className="admin-main">
        <header className="topbar"><span>لوحة التحكم</span><span className="user-email">{user.email}</span></header>
        {children}
      </section>
    </div>
  );
}
