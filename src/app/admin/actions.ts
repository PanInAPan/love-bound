"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COLS, denganLink, requireAdmin, siteUrl, type KeychainAdmin } from "@/lib/admin";
import { MAKS_PER_BATCH, PACKAGES, type PackageName } from "@/lib/packages";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// Buat satu atau beberapa keychain sekaligus. Kode dibuat otomatis oleh database
// (fungsi buat_kode_keychain di 03_kode_otomatis.sql), lalu link NFC dan link kartu dikembalikan.
export async function buatKeychain(input: { paket: string; jumlah: number; catatan: string }) {
  return wrap(async (): Promise<KeychainAdmin[]> => {
    await requireAdmin();
    if (!(input.paket in PACKAGES)) throw new Error("Paket tidak dikenal");
    const jumlah = Math.floor(Number(input.jumlah));
    if (!(jumlah >= 1 && jumlah <= MAKS_PER_BATCH)) throw new Error(`Jumlah harus 1–${MAKS_PER_BATCH}`);
    const catatan = input.catatan.trim().slice(0, 200) || null;

    const baris = Array.from({ length: jumlah }, () => ({ paket: input.paket as PackageName, catatan }));
    const { data, error } = await createAdminClient().from("keychains").insert(baris).select(ADMIN_COLS);
    if (error) {
      if (/null value in column "id"/.test(error.message)) {
        throw new Error("Kode otomatis belum aktif. Jalankan supabase/03_kode_otomatis.sql di SQL Editor.");
      }
      throw new Error(error.message);
    }
    const base = await siteUrl();
    return (data ?? []).map((k) => denganLink(k, base));
  });
}

// Tandai chip sudah/belum ditulis, supaya antrean produksi rapi.
export async function tandaiDitulis(id: string, ditulis: boolean) {
  return wrap(async (): Promise<KeychainAdmin> => {
    await requireAdmin();
    const { data, error } = await createAdminClient().from("keychains")
      .update({ nfc_ditulis_pada: ditulis ? new Date().toISOString() : null })
      .eq("id", id).select(ADMIN_COLS).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Keychain tidak ditemukan");
    return denganLink(data, await siteUrl());
  });
}
