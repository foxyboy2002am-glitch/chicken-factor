"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const branchSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
  name_ar: z.string().trim().min(2).max(120), name_en: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(), address_ar: z.string().trim().max(500).optional(), address_en: z.string().trim().max(500).optional(),
});
const categorySchema = z.object({
  name_ar: z.string().trim().min(2).max(100), name_en: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
});
const productSchema = z.object({
  category_id: z.string().uuid().optional().or(z.literal("")), name_ar: z.string().trim().min(2).max(150),
  name_en: z.string().trim().min(2).max(150), description_ar: z.string().trim().max(1000).optional(),
  description_en: z.string().trim().max(1000).optional(), sku: z.string().trim().max(60).optional(),
  variant_name_ar: z.string().trim().min(1).max(80), variant_name_en: z.string().trim().min(1).max(80),
  price: z.coerce.number().min(0).max(100000),
});

async function requireGlobalAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role, branch_id").eq("user_id", user.id);
  if (roleError) throw new Error("تعذر التحقق من صلاحيات الحساب.");
  if (!roles?.some(r => (r.role === "super_admin" || r.role === "admin") && r.branch_id === null))
    redirect("/login?error=unauthorized");
  return supabase;
}

async function uploadProductImage(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(value.type) || value.size > 5 * 1024 * 1024) throw new Error("الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 5MB.");
  const ext = value.type === "image/jpeg" ? "jpg" : value.type === "image/png" ? "png" : "webp";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, value, { contentType: value.type, upsert: false });
  if (error) throw new Error("فشل رفع صورة المنتج.");
  return path;
}

export async function createBranch(formData: FormData) {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/branches?error=validation");
  const supabase = await requireGlobalAdmin();
  const { error } = await supabase.from("branches").insert({ ...parsed.data, phone: parsed.data.phone || null, address_ar: parsed.data.address_ar || null, address_en: parsed.data.address_en || null });
  if (error) redirect("/admin/branches?error=save");
  revalidatePath("/admin"); revalidatePath("/admin/branches"); redirect("/admin/branches?success=created");
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=category");
  const supabase = await requireGlobalAdmin();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) redirect("/admin/products?error=category-save");
  revalidatePath("/admin/products"); redirect("/admin/products?success=category");
}

export async function createProduct(formData: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=product");
  const supabase = await requireGlobalAdmin();
  let imagePath: string | null = null;
  try { imagePath = await uploadProductImage(supabase, formData.get("image")); } catch { redirect("/admin/products?error=image"); }
  const { data: product, error } = await supabase.from("products").insert({
    category_id: parsed.data.category_id || null, name_ar: parsed.data.name_ar, name_en: parsed.data.name_en,
    description_ar: parsed.data.description_ar || null, description_en: parsed.data.description_en || null,
    sku: parsed.data.sku || null, image_path: imagePath,
  }).select("id").single();
  if (error || !product) redirect("/admin/products?error=product-save");
  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: product.id, name_ar: parsed.data.variant_name_ar, name_en: parsed.data.variant_name_en, base_price: parsed.data.price,
  });
  if (variantError) { await supabase.from("products").delete().eq("id", product.id); redirect("/admin/products?error=variant-save"); }
  revalidatePath("/admin"); revalidatePath("/admin/products"); revalidatePath("/menu"); redirect("/admin/products?success=product");
}

export async function updateProduct(formData: FormData) {
  const supabase = await requireGlobalAdmin();
  const productId = String(formData.get("product_id") || "");
  const variantId = String(formData.get("variant_id") || "");
  const parsed = z.object({
    name_ar: z.string().trim().min(2).max(150), name_en: z.string().trim().min(2).max(150),
    category_id: z.string().uuid().optional().or(z.literal("")), sku: z.string().trim().max(60).optional(),
    variant_name_ar: z.string().trim().max(80).optional(), price: z.coerce.number().min(0).max(100000).optional(),
    is_active: z.enum(["true","false"]),
  }).safeParse(Object.fromEntries(formData));
  if (!productId || !parsed.success) redirect("/admin/products?error=validation");
  let imagePath: string | null = null;
  try { imagePath = await uploadProductImage(supabase, formData.get("image")); } catch { redirect("/admin/products?error=image"); }
  const { error } = await supabase.from("products").update({
    name_ar: parsed.data.name_ar, name_en: parsed.data.name_en, category_id: parsed.data.category_id || null,
    sku: parsed.data.sku || null, is_active: parsed.data.is_active === "true",
    ...(imagePath ? { image_path: imagePath } : {}),
  }).eq("id", productId);
  if (error) redirect("/admin/products?error=update");
  if (variantId && parsed.data.price !== undefined) {
    const { error: variantError } = await supabase.from("product_variants").update({
      name_ar: parsed.data.variant_name_ar || "الحجم الأساسي", base_price: parsed.data.price,
    }).eq("id", variantId).eq("product_id", productId);
    if (variantError) redirect("/admin/products?error=price");
  }
  revalidatePath("/admin"); revalidatePath("/admin/products"); revalidatePath("/menu");
  redirect("/admin/products?success=updated");
}
