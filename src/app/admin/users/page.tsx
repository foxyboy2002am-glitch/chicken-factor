import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteBackofficeUser,removeBackofficeRole } from "@/app/actions/users";
export default async function UsersPage({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){
 const params=await searchParams;await requireBackoffice(["super_admin"]);
 const admin=await createSupabaseAdminClient();
 const [{data:roles},{data:branches},{data:userList,error}]=await Promise.all([
  admin.from("user_roles").select("id,user_id,role,branch_id,created_at").order("created_at",{ascending:false}),
  admin.from("branches").select("id,name_ar").order("name_ar"),
  admin.auth.admin.listUsers({page:1,perPage:1000})
 ]);
 const users=new Map((userList?.users??[]).map(u=>[u.id,u]));
 const errors:Record<string,string>={validation:"راجع البيانات المدخلة.",branch:"اختيار الفرع مطلوب لموظف الفرع فقط.",auth:"تعذر قراءة حسابات المستخدمين.",invite:"تعذر إرسال دعوة البريد الإلكتروني. قد يكون المستخدم مدعوًا بالفعل.",role:"تعذر حفظ الصلاحية.",remove:"تعذر حذف الصلاحية."};
 return <main className="dashboard-content" dir="rtl"><div className="page-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h1>المستخدمون والصلاحيات</h1><p className="muted">دعوة الموظفين وتحديد دور كل حساب والفرع المرتبط به.</p></div></div>
 {params.error?<p className="notice error">{errors[params.error]||"حدث خطأ."}</p>:null}{params.success?<p className="notice success">تم تنفيذ العملية بنجاح.</p>:null}{error?<p className="notice error">تعذر تحميل قائمة المستخدمين.</p>:null}
 <section className="content-card"><h2>إضافة موظف أو منح صلاحية</h2><form action={inviteBackofficeUser} className="data-form">
 <label>البريد الإلكتروني<input name="email" type="email" required/></label><label>اسم الموظف<input name="full_name" required/></label>
 <label>الصلاحية<select name="role" defaultValue="call_center"><option value="call_center">كول سنتر</option><option value="accountant">حسابات</option><option value="operations">متابعة وتشغيل</option><option value="branch_manager">مدير فرع</option><option value="branch_staff">موظف فرع</option><option value="admin">مدير النظام</option></select></label>
 <label>الفرع (لموظفي الفروع فقط)<select name="branch_id" defaultValue=""><option value="">بدون فرع</option>{(branches??[]).map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></label>
 <button type="submit">إرسال دعوة وحفظ الصلاحية</button></form><p className="muted">سيتم إرسال دعوة تسجيل إلى البريد الإلكتروني عند إضافة حساب جديد. الحساب الموجود يمكن إسناد دور إضافي له.</p></section>
 <section className="content-card"><h2>الصلاحيات المسجلة</h2><div className="table-wrap"><table><thead><tr><th>المستخدم</th><th>البريد</th><th>الدور</th><th>الفرع</th><th>الإجراء</th></tr></thead><tbody>
 {(roles??[]).map(r=>{const u=users.get(r.user_id);return <tr key={r.id}><td>{u?.user_metadata?.full_name||u?.email||r.user_id}</td><td dir="ltr">{u?.email||"—"}</td><td>{({super_admin:"مدير عام",admin:"مدير نظام",call_center:"كول سنتر",accountant:"حسابات",operations:"متابعة وتشغيل",branch_manager:"مدير فرع",branch_staff:"موظف فرع",customer:"عميل"} as Record<string,string>)[r.role]||r.role}</td><td>{branches?.find(b=>b.id===r.branch_id)?.name_ar||"—"}</td><td>{r.role!=="super_admin"?<form action={removeBackofficeRole}><input type="hidden" name="role_id" value={r.id}/><button type="submit" className="danger-button">إزالة الصلاحية</button></form>:"حساب محمي"}</td></tr>})}
 {!roles?.length?<tr><td colSpan={5} className="empty">لا توجد صلاحيات مسجلة.</td></tr>:null}</tbody></table></div></section></main>;
}
