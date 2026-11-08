import { createSupabaseServerClient } from "@/lib/supabase/server";
import CheckoutClient from "@/components/checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("branches")
    .select("id,name_ar,accepts_delivery,accepts_pickup")
    .eq("is_active", true).order("priority").order("name_ar");
  return <CheckoutClient branches={data ?? []} />;
}
