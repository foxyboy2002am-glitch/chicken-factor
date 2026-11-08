"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updatePaymentMethods(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role,branch_id").eq("user_id",user.id);
  if (roleError || !roles?.some(r => ["admin","super_admin"].includes(r.role) && r.branch_id === null)) redirect("/login?error=unauthorized");

  const schema = z.object({
    cash_enabled: z.enum(["true","false"]),
    paymob_enabled: z.enum(["true","false"]),
    cash_name_ar: z.string().trim().min(2).max(100),
    paymob_name_ar: z.string().trim().min(2).max(100),
    cash_description_ar: z.string().trim().max(250).optional(),
    paymob_description_ar: z.string().trim().max(250).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/settings?error=validation");

  const rows = [
    { code:"cash",name_ar:parsed.data.cash_name_ar,name_en:"Cash on delivery",description_ar:parsed.data.cash_description_ar || null,is_enabled:parsed.data.cash_enabled === "true",sort_order:1 },
    { code:"paymob",name_ar:parsed.data.paymob_name_ar,name_en:"Visa / Mastercard",description_ar:parsed.data.paymob_description_ar || null,is_enabled:parsed.data.paymob_enabled === "true",sort_order:2 },
  ];
  const { error: saveError } = await supabase.from("payment_method_settings").upsert(rows,{onConflict:"code"});
  if (saveError) redirect("/admin/settings?error=save");
  revalidatePath("/admin/settings"); revalidatePath("/checkout"); revalidatePath("/menu");
  redirect("/admin/settings?success=saved");
}
