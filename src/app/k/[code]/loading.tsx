import SampulPesan from "@/components/galeri/SampulPesan";

// Tampil sebentar saat data keychain dan link foto sedang disiapkan.
export default function Memuat() {
  return (
    <main className="flex-1">
      <SampulPesan judul="Membuka album…" />
    </main>
  );
}
