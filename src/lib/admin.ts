import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { PackageName } from "@/lib/packages";

// Email yang boleh membuka /admin, dari env ADMIN_EMAILS (pisahkan dengan koma).
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) throw new Error("Khusus admin");
  return user;
}

// Domain untuk link yang ditulis ke chip. Isi NEXT_PUBLIC_SITE_URL dengan domain produksi,
// supaya chip tidak berisi link localhost walaupun admin dibuka dari laptop.
export async function siteUrl() {
  const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (dariEnv) return dariEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export const ADMIN_COLS = "id, edit_token, paket, catatan, created_at, nfc_ditulis_pada, owner_id, dikirim_pada";

type Baris = {
  id: string; edit_token: string; paket: PackageName; catatan: string | null; created_at: string;
  nfc_ditulis_pada: string | null; owner_id: string | null; dikirim_pada: string | null;
};

export type KeychainAdmin = Omit<Baris, "edit_token" | "owner_id"> & {
  diklaim: boolean;
  linkNfc: string;   // ditulis ke chip
  linkKartu: string; // dicetak di kartu petunjuk (QR), untuk pembeli mengisi kenangan
};

export function denganLink(k: Baris, base: string): KeychainAdmin {
  const kode = encodeURIComponent(k.id);
  return {
    id: k.id, paket: k.paket, catatan: k.catatan, created_at: k.created_at,
    nfc_ditulis_pada: k.nfc_ditulis_pada, dikirim_pada: k.dikirim_pada,
    diklaim: k.owner_id != null,
    linkNfc: `${base}/k/${kode}`,
    linkKartu: `${base}/edit/${kode}?t=${k.edit_token}`,
  };
}
