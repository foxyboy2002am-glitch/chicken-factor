import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role, branch_id")
    .eq("user_id", user.id);

  if (roleError) {
    throw new Error("Unable to verify account permissions.");
  }

  const isAdmin = roles?.some((item) =>
    item.role === "super_admin" || item.role === "admin"
  );

  if (!isAdmin) {
    redirect("/login?error=unauthorized");
  }

  return { user, roles: roles ?? [] };
}
