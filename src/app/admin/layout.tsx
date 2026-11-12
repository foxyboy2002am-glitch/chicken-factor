import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { signOut } from "@/app/actions/auth";
import AdminOrderNotifications from "@/components/admin-order-notifications";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, roles } = await requireBackoffice();
  const roleSet = new Set(roles.map(r=>r.role));
  const canManage = roleSet.has("admin") || roleSet.has("super_admin");
  const canCall = roleSet.has("call_center") || canManage;
  const canAccounts = roleSet.has("accountant") || canManage;
  const canTrack = roleSet.has("operations") || roleSet.has("branch_manager") || roleSet.has("branch_staff") || canManage;
  const canUsers = roleSet.has("super_admin");
  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><span>CF</span><div><strong>Chicken Factor</strong><small>Management</small></div></div>
      <nav aria-label="القائمة الرئيسية">
        <a href="/admin">نظرة عامة</a>
        {canCall ? <a href="/admin/call-center">الكول سنتر</a> : null}
        {canTrack ? <a href="/admin/tracking">متابعة الفروع</a> : null}
        {canAccounts ? <a href="/admin/accounts">الحسابات</a> : null}
        {canManage ? <><a href="/admin/branches">الفروع</a><a href="/admin/products">المنتجات والمنيو</a><a href="/admin/offers">العروض والخصومات</a><a href="/admin/settings">الإعدادات</a></> : null}
        <a href="/admin/orders">الطلبات</a><a href="/admin/reports">التقارير</a>
        {canUsers ? <a href="/admin/users">المستخدمون والصلاحيات</a> : null}
      </nav>
      <form action={signOut}><button className="signout" type="submit">تسجيل الخروج</button></form>
    </aside>
    <section className="admin-main"><header className="topbar"><div className="topbar-title"><span className="topbar-mark">CF</span><span>لوحة التحكم<small>Chicken Factor Management</small></span></div><div className="topbar-tools"><AdminOrderNotifications /><span className="user-email">{user.email}</span></div></header>{children}</section>
  </div>;
}
