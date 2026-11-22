import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEYCHAIN_COLS, listMedia, type Keychain } from "@/lib/keychain";
import Slideshow, { type SlideshowData } from "./Slideshow";

export const dynamic = "force-dynamic";

// Halaman publik yang dibuka dari chip NFC — tidak perlu login.
// Data dibaca di server dengan secret key; browser hanya dapat signed URL (berlaku 1 jam).
export default async function KeychainPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS).eq("id", code).maybeSingle();
  if (!data) notFound();
  const k = data as Keychain;

  let view: SlideshowData;
  if (new Date(k.aktif_sampai) < new Date()) {
    view = { state: "expired", judul: k.judul };
  } else if (k.buka_pada && new Date(k.buka_pada) > new Date()) {
    view = { state: "locked", buka_pada: k.buka_pada, judul: k.judul, untuk: k.untuk };
  } else {
    const media = (await listMedia(k.id)).map(({ kind, url }) => ({ kind, url }));
    view = { state: "open", judul: k.judul, untuk: k.untuk, pesan: k.pesan, link_lagu: k.link_lagu, media,
      empty: !k.pesan && media.length === 0 };
  }
  return <Slideshow data={view} />;
}
