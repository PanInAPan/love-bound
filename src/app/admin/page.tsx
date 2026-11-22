import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COLS, denganLink, getAdmin, siteUrl } from "@/lib/admin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

// Halaman produksi: buat keychain baru, salin link untuk ditulis ke chip.
// Login diwajibkan oleh middleware; selain email di ADMIN_EMAILS akan melihat 404.
export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const base = await siteUrl();
  const { data, error } = await createAdminClient().from("keychains").select(ADMIN_COLS)
    .order("created_at", { ascending: false }).order("id").limit(200);

  return (
    <AdminPanel
      email={admin.email ?? ""}
      base={base}
      awal={(data ?? []).map((k) => denganLink(k, base))}
      galatAwal={error ? perbaikiPesan(error.message) : null}
    />
  );
}

function perbaikiPesan(pesan: string) {
  return /catatan|nfc_ditulis_pada/.test(pesan)
    ? "Kolom baru belum ada. Jalankan supabase/03_kode_otomatis.sql di SQL Editor Supabase."
    : pesan;
}
