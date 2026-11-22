import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEYCHAIN_COLS, listMedia, type Keychain, type MediaItem } from "@/lib/keychain";
import GaleriMemori from "@/components/galeri/GaleriMemori";
import SampulPesan from "@/components/galeri/SampulPesan";
import HitungMundur from "@/components/galeri/HitungMundur";
import { labelSampul } from "@/components/galeri/jenis";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#1d3a30",
};

// Halaman publik yang dibuka dari chip NFC, tanpa login: https://domainmu.id/k/<KODE>
// Data dibaca di server dengan secret key; browser hanya menerima signed URL (berlaku 1 jam).
export default async function HalamanKenangan({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS).eq("id", code).maybeSingle();
  if (!data) notFound();
  const k = data as Keychain;

  const sekarang = new Date();
  const kecil = labelSampul(k.untuk);
  const judul = k.judul ?? "Untukmu";

  if (new Date(k.aktif_sampai) < sekarang) {
    return (
      <main className="flex-1">
        <SampulPesan kecil={kecil} judul={judul}>
          <p className="mt-3 text-base">Masa aktif album ini sudah berakhir.</p>
        </SampulPesan>
      </main>
    );
  }

  if (k.buka_pada && new Date(k.buka_pada) > sekarang) {
    const tanggalTeks = new Date(k.buka_pada).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });
    return (
      <main className="flex-1">
        <SampulPesan kecil={kecil} judul={judul}>
          <HitungMundur bukaPada={k.buka_pada} tanggalTeks={tanggalTeks} />
        </SampulPesan>
      </main>
    );
  }

  const media = await listMedia(k.id);

  if (!k.pesan && media.length === 0) {
    return (
      <main className="flex-1">
        <SampulPesan kecil={kecil} judul={k.judul ?? "Album ini belum diisi"}>
          <p className="mt-3 text-base">Pemilik keychain bisa mengisinya lewat link di kartu petunjuk.</p>
        </SampulPesan>
      </main>
    );
  }

  const ambil = (jenis: MediaItem["kind"]) =>
    media.filter((m) => m.kind === jenis && m.url).map((m) => m.url);

  return (
    <main className="flex-1">
      <GaleriMemori
        data={{
          judul: k.judul,
          untuk: k.untuk,
          pesan: k.pesan,
          linkLagu: k.link_lagu,
          foto: ambil("photo"),
          video: ambil("video"),
          voice: ambil("voice"),
        }}
      />
    </main>
  );
}
