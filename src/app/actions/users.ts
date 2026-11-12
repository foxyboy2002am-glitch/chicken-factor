"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBackoffice } from "@/lib/auth/require-backoffice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function inviteBackofficeUser(formData:FormData){
  await requireBackoffice(["super_admin"]);
  const parsed=z.object({
    email:z.string().trim().email().max(254),full_name:z.string().trim().min(2).max(120),
    role:z.enum(["admin","call_center","accountant","operations","branch_manager","branch_staff"]),
    branch_id:z.string().uuid().optional().or(z.literal(""))
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/admin/users?error=validation");
  const branchRole=["branch_manager","branch_staff"].includes(parsed.data.role);
  if(branchRole&&!parsed.data.branch_id) redirect("/admin/users?error=branch");
  if(!branchRole&&parsed.data.branch_id) redirect("/admin/users?error=branch");
  const admin=await createSupabaseAdminClient();
  let userId:string|undefined;
  const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError) redirect("/admin/users?error=auth");
  const existing=list.users.find(u=>u.email?.toLowerCase()===parsed.data.email.toLowerCase());
  if(existing) userId=existing.id;
  else{
    const {data,error}=await admin.auth.admin.inviteUserByEmail(parsed.data.email,{data:{full_name:parsed.data.full_name}});
    if(error||!data.user) redirect("/admin/users?error=invite");
    userId=data.user.id;
  }
  const {error:roleError}=await admin.from("user_roles").upsert({
    user_id:userId,role:parsed.data.role,branch_id:branchRole?parsed.data.branch_id:null
  },{onConflict:"user_id,role,branch_id"});
  if(roleError){
    console.error("[users] role assignment failed",roleError.message);
    redirect("/admin/users?error=role");
  }
  await admin.from("profiles").upsert({id:userId,full_name:parsed.data.full_name},{onConflict:"id"});
  revalidatePath("/admin/users");
  redirect("/admin/users?success=invited");
}

export async function removeBackofficeRole(formData:FormData){
  await requireBackoffice(["super_admin"]);
  const parsed=z.object({role_id:z.string().uuid()}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/admin/users?error=validation");
  const admin=await createSupabaseAdminClient();
  const {error}=await admin.from("user_roles").delete().eq("id",parsed.data.role_id).neq("role","super_admin");
  if(error) redirect("/admin/users?error=remove");
  revalidatePath("/admin/users");redirect("/admin/users?success=removed");
}
