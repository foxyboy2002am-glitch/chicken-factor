"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireOfferAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase
    .from("user_roles").select("role, branch_id").eq("user_id", user.id);
  if (roleError) throw new Error("تعذر التحقق من صلاحيات الحساب.");
  if (!roles?.some((r) => (r.role === "admin" || r.role === "super_admin") && r.branch_id === null)) {
    redirect("/login?error=unauthorized");
  }
  return supabase;
}

const offerSchema = z.object({
  name_ar: z.string().trim().min(2).max(150),
  name_en: z.string().trim().min(2).max(150),
  description_ar: z.string().trim().max(1000).optional(),
  description_en: z.string().trim().max(1000).optional(),
  discount_type: z.enum(["percentage", "fixed", "bundle_price"]),
  discount_value: z.coerce.number().positive().max(100000),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  is_active: z.enum(["true", "false"]),
});

function dateValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("تاريخ العرض غير صحيح.");
  return date.toISOString();
}

function validateOffer(formData: FormData) {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/offers?error=validation");
  if (parsed.data.discount_type === "percentage" && parsed.data.discount_value > 100) {
    redirect("/admin/offers?error=discount");
  }
  const startsAt = dateValue(parsed.data.starts_at);
  const endsAt = dateValue(parsed.data.ends_at);
  if (new Date(endsAt) <= new Date(startsAt)) redirect("/admin/offers?error=dates");
  return {
    name_ar: parsed.data.name_ar,
    name_en: parsed.data.name_en,
    description_ar: parsed.data.description_ar || null,
    description_en: parsed.data.description_en || null,
    discount_type: parsed.data.discount_type,
    discount_value: parsed.data.discount_value,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: parsed.data.is_active === "true",
  };
}

export async function createOffer(formData: FormData) {
  const supabase = await requireOfferAdmin();
  const values = validateOffer(formData);
  const { error } = await supabase.from("offers").insert(values);
  if (error) redirect("/admin/offers?error=save");
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect("/admin/offers?success=created");
}

export async function updateOffer(formData: FormData) {
  const supabase = await requireOfferAdmin();
  const id = String(formData.get("offer_id") || "");
  if (!z.string().uuid().safeParse(id).success) redirect("/admin/offers?error=validation");
  const values = validateOffer(formData);
  const { error } = await supabase.from("offers").update(values).eq("id", id);
  if (error) redirect("/admin/offers?error=update");
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect("/admin/offers?success=updated");
}

export async function toggleOffer(formData: FormData) {
  const supabase = await requireOfferAdmin();
  const id = String(formData.get("offer_id") || "");
  const active = String(formData.get("is_active") || "");
  if (!z.string().uuid().safeParse(id).success || !["true", "false"].includes(active)) {
    redirect("/admin/offers?error=validation");
  }
  const { error } = await supabase.from("offers").update({ is_active: active === "true" }).eq("id", id);
  if (error) redirect("/admin/offers?error=update");
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect("/admin/offers?success=status");
}
