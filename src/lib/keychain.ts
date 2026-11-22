import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, PACKAGES, type MediaKind, type PackageName } from "@/lib/packages";

export type Keychain = {
  id: string; paket: PackageName; judul: string | null; untuk: string | null; pesan: string | null;
  link_lagu: string | null; buka_pada: string | null; aktif_sampai: string;
  dikirim_pada: string | null; jumlah_ubah: number; owner_id: string | null;
};
export type MediaItem = { path: string; kind: MediaKind; size: number; url: string };

export const KEYCHAIN_COLS = "id, paket, judul, untuk, pesan, link_lagu, buka_pada, aktif_sampai, dikirim_pada, jumlah_ubah, owner_id";

export function canEdit(k: Keychain) {
  const max = PACKAGES[k.paket].edits;
  return k.dikirim_pada == null || max == null || k.jumlah_ubah < max;
}

// File disimpan sebagai <id>/<timestamp>-<kind>.<ext>, jadi urutan nama = urutan upload.
export function kindOf(path: string): MediaKind | null {
  const m = path.match(/-(photo|voice|video)\.\w+$/);
  return (m?.[1] as MediaKind) ?? null;
}

export async function listMedia(id: string, expiresIn = 3600): Promise<MediaItem[]> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).list(id, { limit: 100, sortBy: { column: "name", order: "asc" } });
  const files = (data ?? []).filter((f) => f.id && kindOf(f.name));
  if (files.length === 0) return [];
  const paths = files.map((f) => `${id}/${f.name}`);
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  return files.map((f, i) => ({
    path: paths[i], kind: kindOf(f.name)!, size: (f.metadata?.size as number) ?? 0, url: signed?.[i]?.signedUrl ?? "",
  }));
}
