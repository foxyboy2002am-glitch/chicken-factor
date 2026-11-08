"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateStoreContactSettings(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role,branch_id").eq("user_id", user.id);
  if (roleError || !roles?.some(r => ["admin","super_admin"].includes(r.role) && r.branch_id === null)) redirect("/login?error=unauthorized");

  const parsed = z.object({
    whatsapp_number: z.string().trim().regex(/^\+?[0-9\s()-]{8,20}$/, "رقم واتساب غير صحيح").or(z.literal("")),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/settings?error=whatsapp");

  const normalized = parsed.data.whatsapp_number.replace(/\D/g, "");
  if (normalized && normalized.length < 10) redirect("/admin/settings?error=whatsapp");
  const { error: saveError } = await supabase.from("store_contact_settings").upsert({ id: 1, whatsapp_number: normalized }, { onConflict: "id" });
  if (saveError) redirect("/admin/settings?error=whatsapp-save");
  revalidatePath("/admin/settings"); revalidatePath("/menu");
  redirect("/admin/settings?success=whatsapp");
}
