"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBackoffice } from "@/lib/auth/require-backoffice";

const statuses = ["pending_confirmation","confirmed","preparing","ready","out_for_delivery","completed","rejected","cancelled","payment_failed"] as const;
const paymentStatuses = ["pending","paid","failed","refunded","partially_refunded"] as const;

async function recordHistory(supabase: any, orderId: string, oldStatus: string, newStatus: string, userId: string, note?: string) {
  const { error } = await supabase.from("order_status_history").insert({
    order_id: orderId, old_status: oldStatus, new_status: newStatus, changed_by: userId, note: note || null,
  });
  if (error) console.error("[orders] history insert failed", error.message);
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase, user, roles } = await requireBackoffice();
  const parsed = z.object({ order_id:z.string().uuid(), status:z.enum(statuses), note:z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/orders?error=validation");
  const roleSet = new Set(roles.map(r=>r.role));
  const isGlobalOperator = ["admin","super_admin","call_center","operations"].some(r=>roleSet.has(r));
  const branchRole = roles.find(r=>["branch_manager","branch_staff"].includes(r.role));
  if (!isGlobalOperator && !branchRole) redirect("/login?error=unauthorized");
  const { data: current, error: readError } = await supabase.from("orders").select("id,status").eq("id",parsed.data.order_id).single();
  if (readError || !current) redirect("/admin/orders?error=not-found");
  if (current.status === parsed.data.status) redirect("/admin/orders?success=unchanged");
  const branchTransitions:Record<string,string[]>={pending_confirmation:["confirmed","rejected"],confirmed:["preparing","cancelled"],preparing:["ready","cancelled"],ready:["out_for_delivery","completed"],out_for_delivery:["completed","cancelled"]};
  if (!isGlobalOperator && !branchTransitions[current.status]?.includes(parsed.data.status)) redirect("/admin/orders?error=transition");
  const patch:any = { status:parsed.data.status };
  if(parsed.data.status==="confirmed") patch.accepted_at=new Date().toISOString();
  if(parsed.data.status==="completed") patch.completed_at=new Date().toISOString();
  const { error } = await supabase.from("orders").update(patch).eq("id",parsed.data.order_id);
  if(error) redirect("/admin/orders?error=update");
  await recordHistory(supabase,parsed.data.order_id,current.status,parsed.data.status,user.id,parsed.data.note);
  ["/admin/orders","/admin/call-center","/admin/tracking","/admin/reports","/admin"].forEach(path => revalidatePath(path));
  redirect("/admin/orders?success=updated");
}

export async function assignOrderBranch(formData: FormData) {
  const { supabase, user } = await requireBackoffice(["admin","super_admin","call_center","operations"]);
  const parsed=z.object({order_id:z.string().uuid(),branch_id:z.string().uuid()}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/admin/call-center?error=validation");
  const {data: current,error:readError}=await supabase.from("orders").select("id,branch_id,status").eq("id",parsed.data.order_id).single();
  if(readError||!current) redirect("/admin/call-center?error=not-found");
  const {data: branch,error:branchError}=await supabase.from("branches").select("id,is_active").eq("id",parsed.data.branch_id).single();
  if(branchError||!branch?.is_active) redirect("/admin/call-center?error=branch");
  const {error}=await supabase.from("orders").update({branch_id:parsed.data.branch_id}).eq("id",parsed.data.order_id);
  if(error) redirect("/admin/call-center?error=assign");
  await recordHistory(supabase,parsed.data.order_id,current.status,current.status,user.id,"تم تحويل الطلب إلى فرع آخر");
  ["/admin/orders","/admin/call-center","/admin/tracking","/admin/reports"].forEach(path => revalidatePath(path));
  redirect("/admin/call-center?success=assigned");
}

export async function setPaymentStatus(formData: FormData) {
  const {supabase}=await requireBackoffice(["admin","super_admin","accountant"]);
  const parsed=z.object({order_id:z.string().uuid(),payment_id:z.string().uuid(),status:z.enum(paymentStatuses)}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/admin/accounts?error=validation");
  const {error}=await supabase.rpc("set_order_payment_status",{
    _order_id:parsed.data.order_id,_payment_id:parsed.data.payment_id,_status:parsed.data.status
  });
  if(error) redirect("/admin/accounts?error=payment");
  ["/admin/accounts","/admin/reports","/admin/orders"].forEach(path => revalidatePath(path));
  redirect("/admin/accounts?success=updated");
}

export async function createCallCenterOrder(formData: FormData) {
  const {supabase}=await requireBackoffice(["admin","super_admin","call_center"]);
  const parsed=z.object({
    branch_id:z.string().uuid(),fulfillment:z.enum(["delivery","pickup"]),
    customer_name:z.string().trim().min(2).max(120),customer_phone:z.string().trim().min(10).max(20),
    area:z.string().trim().max(120).optional(),street:z.string().trim().max(180).optional(),
    building:z.string().trim().max(40).optional(),floor:z.string().trim().max(40).optional(),
    landmark:z.string().trim().max(180).optional(),notes:z.string().trim().max(500).optional(),
    items_json:z.string().min(2).max(12000)
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/admin/call-center?error=validation");
  let rawItems: unknown;
  try { rawItems=JSON.parse(parsed.data.items_json); } catch { redirect("/admin/call-center?error=validation"); }
  const itemResult=z.array(z.object({variant_id:z.string().uuid(),quantity:z.number().int().min(1).max(20)})).min(1).max(30).safeParse(rawItems);
  if(!itemResult.success) redirect("/admin/call-center?error=validation");
  const items=itemResult.data;
  const address=parsed.data.fulfillment==="delivery"?{
    area:parsed.data.area||"",street:parsed.data.street||"",building:parsed.data.building||"",
    floor:parsed.data.floor||"",landmark:parsed.data.landmark||""
  }:null;
  const {data,error}=await supabase.rpc("create_call_center_order",{
    _branch_id:parsed.data.branch_id,_fulfillment:parsed.data.fulfillment,
    _customer_name:parsed.data.customer_name,_customer_phone:parsed.data.customer_phone,
    _address:address,_notes:parsed.data.notes||"",_items:items
  });
  if(error){console.error("[call-center] order creation failed",error.message);redirect("/admin/call-center?error=create");}
  revalidatePath("/admin/call-center");revalidatePath("/admin/orders");revalidatePath("/admin/tracking");revalidatePath("/admin/reports");
  redirect("/admin/call-center?success=created&order="+encodeURIComponent(String(data.order_number)));
}
