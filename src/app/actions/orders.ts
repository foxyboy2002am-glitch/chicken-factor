"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = ["pending_confirmation","confirmed","preparing","ready","out_for_delivery","completed","rejected","cancelled","payment_failed"] as const;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role,branch_id").eq("user_id", user.id);
  if (roleError) throw new Error("تعذر التحقق من صلاحيات الحساب.");
  if (!roles?.some((r) => ["admin","super_admin"].includes(r.role) && r.branch_id === null)) redirect("/login?error=unauthorized");
  return { supabase, user };
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const parsed = z.object({ order_id: z.string().uuid(), status: z.enum(allowedStatuses), note: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/orders?error=validation");
  const { data: current, error: readError } = await supabase.from("orders").select("id,status").eq("id",parsed.data.order_id).single();
  if (readError || !current) redirect("/admin/orders?error=not-found");
  if (current.status === parsed.data.status) redirect("/admin/orders?success=unchanged");
  const { error } = await supabase.from("orders").update({
    status: parsed.data.status,
    ...(parsed.data.status === "confirmed" ? { accepted_at: new Date().toISOString() } : {}),
    ...(parsed.data.status === "completed" ? { completed_at: new Date().toISOString() } : {}),
  }).eq("id",parsed.data.order_id);
  if (error) redirect("/admin/orders?error=update");
  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: parsed.data.order_id, old_status: current.status, new_status: parsed.data.status,
    changed_by: user.id, note: parsed.data.note || null,
  });
  if (historyError) console.error("[orders] status history insert failed", historyError.message);
  revalidatePath("/admin/orders"); revalidatePath("/admin/reports"); revalidatePath("/admin");
  redirect("/admin/orders?success=updated");
}
