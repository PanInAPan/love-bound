import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEYCHAIN_COLS, type Keychain } from "@/lib/keychain";
import { claimKeychain } from "./actions";
import Dashboard from "./Dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ code?: string; t?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { code, t } = await searchParams;
  let claimError: string | null = null;
  if (code && t) {
    const res = await claimKeychain(code, t);
    if (!res.ok) claimError = res.error;
  }

  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS)
    .eq("owner_id", user.id).order("created_at");
  const keychains = (data ?? []) as Keychain[];

  return <Dashboard email={user.email ?? ""} initialKeychains={keychains}
    initialSelected={code && keychains.some((k) => k.id === code) ? code : keychains[0]?.id ?? null}
    claimError={claimError} />;
}
