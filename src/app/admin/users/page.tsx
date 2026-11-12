import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteBackofficeUser, removeBackofficeRole } from "@/app/actions/users";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };
type UserRole = { id: string; user_id: string; role: string; branch_id: string | null; created_at: string };
type Branch = { id: string; name_ar: string };

const roleLabels: Record<string, string> = {
  super_admin: "مدير عام",
  admin: "مدير نظام",
  call_center: "كول سنتر",
  accountant: "حسابات",
  operations: "متابعة وتشغيل",
  branch_manager: "مدير فرع",
  branch_staff: "موظف فرع",
  customer: "عميل",
};
const errors: Record<string, string> = {
  validation: "راجع البيانات المدخلة.",
  branch: "اختيار الفرع مطلوب لموظف الفرع فقط.",
  auth: "تعذر قراءة حسابات المستخدمين.",
  invite: "تعذر إرسال دعوة البريد الإلكتروني. قد يكون المستخدم مدعوًا بالفعل.",
  role: "تعذر حفظ الصلاحية.",
  remove: "تعذر حذف الصلاحية.",
};

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireBackoffice(["super_admin"]);

  let roles: UserRole[] = [];
  let branches: Branch[] = [];
  let users = new Map<string, { email?: string; user_metadata?: { full_name?: string } }>();
  let loadError = "";

  try {
    const admin = await createSupabaseAdminClient();
    const [rolesResult, branchesResult] = await Promise.all([
      admin.from("user_roles").select("id,user_id,role,branch_id,created_at").order("created_at", { ascending: false }),
      admin.from("branches").select("id,name_ar").order("name_ar"),
    ]);
    if (rolesResult.error) throw new Error("roles");
    if (branchesResult.error) throw new Error("branches");
    roles = (rolesResult.data ?? []) as UserRole[];
    branches = (branchesResult.data ?? []) as Branch[];

    // Auth Admin listUsers is paginated; load all pages instead of silently omitting users after the first 1,000.
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("auth");
      for (const user of data.users) users.set(user.id, user);
      if (data.users.length < 1000) break;
    }
  } catch (error) {
    console.error("[admin/users] failed to load user management data", error);
    loadError = "تعذر تحميل بيانات المستخدمين حاليًا. راجع إعدادات صلاحيات الخادم واتصال Supabase ثم أعد المحاولة.";
  }

  const branchName = new Map(branches.map((branch) => [branch.id, branch.name_ar]));

  return (
    <main className="dashboard-content admin-users-page" dir="rtl">
      <div className="page-heading admin-users-heading">
        <div>
          <p className="eyebrow">ACCESS CONTROL</p>
          <h1>المستخدمون والصلاحيات</h1>
          <p className="muted">إدارة حسابات فريق العمل، الأدوار، والفروع المرتبطة بكل موظف.</p>
        </div>
        <a className="admin-users-back" href="/admin">العودة للوحة التحكم ←</a>
      </div>

      {params.error ? <p className="notice error" role="alert">{errors[params.error] || "حدث خطأ أثناء تنفيذ العملية."}</p> : null}
      {params.success ? <p className="notice success" role="status">تم تنفيذ العملية بنجاح.</p> : null}
      {loadError ? <p className="notice error" role="alert">{loadError}</p> : null}

      <section className="content-card admin-users-invite">
        <div className="admin-users-card-heading"><span className="admin-users-icon">＋</span><div><h2>إضافة موظف أو منح صلاحية</h2><p>أدخل بيانات الموظف وحدد مستوى الوصول المناسب.</p></div></div>
        <form action={inviteBackofficeUser} className="data-form">
          <label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label>اسم الموظف<input name="full_name" autoComplete="name" placeholder="الاسم بالكامل" required /></label>
          <label>الصلاحية<select name="role" defaultValue="call_center"><option value="call_center">كول سنتر</option><option value="accountant">حسابات</option><option value="operations">متابعة وتشغيل</option><option value="branch_manager">مدير فرع</option><option value="branch_staff">موظف فرع</option><option value="admin">مدير النظام</option></select></label>
          <label>الفرع (لموظفي الفروع فقط)<select name="branch_id" defaultValue=""><option value="">بدون فرع</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}</select></label>
          <button type="submit" disabled={Boolean(loadError)}>إرسال الدعوة وحفظ الصلاحية</button>
        </form>
        <p className="muted admin-users-help">الحساب الجديد يستقبل دعوة على البريد الإلكتروني. ويمكن إسناد دور إضافي لحساب موجود بالفعل.</p>
      </section>

      <section className="content-card admin-users-list">
        <header className="admin-users-list-heading"><div><h2>الصلاحيات المسجلة</h2><p>كل دور مسجل يظهر في صف مستقل ويمكن إزالته بشكل منفصل.</p></div><span className="count">{roles.length} صلاحية</span></header>
        <div className="table-wrap">
          <table>
            <thead><tr><th>المستخدم</th><th>البريد الإلكتروني</th><th>الدور</th><th>الفرع</th><th>الإجراء</th></tr></thead>
            <tbody>
              {roles.map((role) => {
                const user = users.get(role.user_id);
                const email = user?.email || "";
                const name = user?.user_metadata?.full_name || email || role.user_id;
                return <tr key={role.id}>
                  <td><div className="admin-user-identity"><span>{name.trim().slice(0, 1).toUpperCase() || "U"}</span><strong>{name}</strong></div></td>
                  <td dir="ltr">{email || "—"}</td>
                  <td><span className={role.role === "super_admin" ? "admin-role-chip is-owner" : "admin-role-chip"}>{roleLabels[role.role] || role.role}</span></td>
                  <td>{role.branch_id ? branchName.get(role.branch_id) || "فرع غير معروف" : "كل الفروع"}</td>
                  <td>{role.role !== "super_admin" ? <form action={removeBackofficeRole}><input type="hidden" name="role_id" value={role.id} /><button type="submit" className="danger-button">إزالة الصلاحية</button></form> : <span className="admin-protected-role">حساب محمي</span>}</td>
                </tr>;
              })}
              {!loadError && !roles.length ? <tr><td colSpan={5} className="empty">لا توجد صلاحيات مسجلة حتى الآن.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      <p className="admin-users-security-note">🔒 إدارة المستخدمين متاحة للمدير العام فقط. لا يتم منح صلاحيات أعلى تلقائيًا عند دعوة الموظفين.</p>
    </main>
  );
}
