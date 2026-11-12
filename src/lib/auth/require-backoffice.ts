import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BackofficeRole = "super_admin"|"admin"|"call_center"|"accountant"|"operations"|"branch_manager"|"branch_staff";
export async function requireBackoffice(allowed?: BackofficeRole[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("id,role,branch_id").eq("user_id",user.id);
  if (roleError) throw new Error("تعذر التحقق من صلاحيات الحساب.");
  const activeRoles = roles ?? [];
  if (!activeRoles.length || (allowed && !activeRoles.some(r=>allowed.includes(r.role as BackofficeRole)))) redirect("/login?error=unauthorized");
  return { supabase, user, roles: activeRoles, isSuperAdmin: activeRoles.some(r=>r.role==="super_admin") };
}
