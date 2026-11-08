"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const branchSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
  name_ar: z.string().trim().min(2).max(120),
  name_en: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  address_ar: z.string().trim().max(500).optional(),
  address_en: z.string().trim().max(500).optional(),
});
const categorySchema = z.object({
  name_ar: z.string().trim().min(2).max(100),
  name_en: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
});
const productSchema = z.object({
  category_id: z.string().uuid().optional().or(z.literal("")),
  name_ar: z.string().trim().min(2).max(150),
  name_en: z.string().trim().min(2).max(150),
  description_ar: z.string().trim().max(1000).optional(),
  description_en: z.string().trim().max(1000).optional(),
  sku: z.string().trim().max(60).optional(),
  variant_name_ar: z.string().trim().min(1).max(80),
  variant_name_en: z.string().trim().min(1).max(80),
  price: z.coerce.number().min(0).max(100000),
});

async function requireGlobalAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles")
    .select("role, branch_id").eq("user_id", user.id);
  if (roleError) throw new Error("تعذر التحقق من صلاحيات الحساب.");
  const allowed = roles?.some((r) =>
    (r.role === "super_admin" || r.role === "admin") && r.branch_id === null
  );
  if (!allowed) redirect("/login?error=unauthorized");
  return supabase;
}

export async function createBranch(formData: FormData) {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/branches?error=validation");
  const supabase = await requireGlobalAdmin();
  const { error } = await supabase.from("branches").insert({
    ...parsed.data,
    phone: parsed.data.phone || null,
    address_ar: parsed.data.address_ar || null,
    address_en: parsed.data.address_en || null,
  });
  if (error) redirect("/admin/branches?error=save");
  revalidatePath("/admin"); revalidatePath("/admin/branches");
  redirect("/admin/branches?success=created");
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=category");
  const supabase = await requireGlobalAdmin();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) redirect("/admin/products?error=category-save");
  revalidatePath("/admin/products");
  redirect("/admin/products?success=category");
}

export async function createProduct(formData: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=product");
  const supabase = await requireGlobalAdmin();
  const { data: product, error } = await supabase.from("products").insert({
    category_id: parsed.data.category_id || null,
    name_ar: parsed.data.name_ar,
    name_en: parsed.data.name_en,
    description_ar: parsed.data.description_ar || null,
    description_en: parsed.data.description_en || null,
    sku: parsed.data.sku || null,
  }).select("id").single();
  if (error || !product) redirect("/admin/products?error=product-save");
  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: product.id,
    name_ar: parsed.data.variant_name_ar,
    name_en: parsed.data.variant_name_en,
    base_price: parsed.data.price,
  });
  if (variantError) {
    await supabase.from("products").delete().eq("id", product.id);
    redirect("/admin/products?error=variant-save");
  }
  revalidatePath("/admin"); revalidatePath("/admin/products");
  redirect("/admin/products?success=product");
}
