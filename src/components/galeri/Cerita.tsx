"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import s from "./kelas";
import Cetak, { kemiringan } from "./Cetak";
import Surat from "./Surat";
import { lamaTampil, susunSlide, type DataKenangan, type Slide } from "./jenis";

// Titik pusat zoom pelan, bergantian supaya tiap foto bergerak sedikit berbeda.
const ASAL_ZOOM = ["30% 35%", "70% 30%", "50% 75%", "35% 65%", "65% 60%"];

type Props = {
  data: DataKenangan;
  onKeAlbum: () => void;
};

type Tekanan = { x: number; y: number; ditahan: boolean; timer: number };

export default function Cerita({ data, onKeAlbum }: Props) {
  const slides = useMemo(() => susunSlide(data), [data]);
  const [aktif, setAktif] = useState(0);
  const [arah, setArah] = useState<1 | -1>(1);
  const [keluar, setKeluar] = useState<{ index: number; arah: 1 | -1 } | null>(null);
  const [jeda, setJeda] = useState(false);
  const [progresMedia, setProgresMedia] = useState(0);
  const tekan = useRef<Tekanan | null>(null);

  const terakhir = slides.length - 1;
  const slide = slides[aktif];
  const durasi = lamaTampil(slide, data.pesan);

  const pindah = useCallback(
    (ke: number) => {
      if (ke < 0 || ke > terakhir || ke === aktif) return;
      const a = ke > aktif ? 1 : -1;
      setArah(a);
      setKeluar({ index: aktif, arah: a });
      setAktif(ke);
      setProgresMedia(0);
      setJeda(false);
    },
    [aktif, terakhir],
  );
  const lanjut = useCallback(() => pindah(aktif + 1), [pindah, aktif]);
  const mundur = useCallback(() => pindah(aktif - 1), [pindah, aktif]);

  // Hapus slide yang sedang keluar setelah animasinya selesai.
  useEffect(() => {
    if (!keluar) return;
    const t = window.setTimeout(() => setKeluar(null), 650);
    return () => window.clearTimeout(t);
  }, [keluar]);

  // Siapkan foto berikutnya lebih dulu supaya tidak berkedip.
  useEffect(() => {
    const berikut = slides[aktif + 1];
    if (berikut?.tipe === "foto") {
      const img = new Image();
      img.src = berikut.url;
    }
  }, [aktif, slides]);

  // Keyboard: panah untuk pindah, spasi untuk jeda, Esc untuk ke album.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") lanjut();
      else if (e.key === "ArrowLeft") mundur();
      else if (e.key === " ") {
        e.preventDefault();
        setJeda((j) => !j);
      } else if (e.key === "Escape") onKeAlbum();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lanjut, mundur, onKeAlbum]);

  // Jeda otomatis saat pengguna pindah aplikasi atau tab.
  useEffect(() => {
    function onGanti() {
      if (document.hidden) setJeda(true);
    }
    document.addEventListener("visibilitychange", onGanti);
    return () => document.removeEventListener("visibilitychange", onGanti);
  }, []);

  // Ketuk kanan = lanjut, ketuk kiri = kembali, geser = pindah, tahan = jeda.
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (slide.tipe === "penutup") return;
    if ((e.target as HTMLElement).closest("button, a, audio")) return;
    const timer = window.setTimeout(() => {
      if (tekan.current) {
        tekan.current.ditahan = true;
        setJeda(true);
      }
    }, 280);
    tekan.current = { x: e.clientX, y: e.clientY, ditahan: false, timer };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const t = tekan.current;
    if (!t || t.ditahan) return;
    if (Math.abs(e.clientX - t.x) > 12 || Math.abs(e.clientY - t.y) > 12) {
      window.clearTimeout(t.timer);
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const t = tekan.current;
    tekan.current = null;
    if (!t) return;
    window.clearTimeout(t.timer);
    if (t.ditahan) {
      setJeda(false);
      return;
    }
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) lanjut();
      else mundur();
      return;
    }
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return; // sedang menggulir surat
    if (e.clientX < e.currentTarget.clientWidth * 0.3) mundur();
    else lanjut();
  }

  function onPointerCancel() {
    const t = tekan.current;
    tekan.current = null;
    if (!t) return;
    window.clearTimeout(t.timer);
    if (t.ditahan) setJeda(false);
  }

  const jumlahFoto = data.foto.length;

  return (
    <div
      className={s.cerita}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {slide.tipe !== "penutup" ? (
        <div className={s.progres} aria-hidden>
          {slides.slice(0, terakhir).map((_, i) => (
            <div key={i} className={s.segmen}>
              {i < aktif ? (
                <span className={`${s.isiSegmen} ${s.isiPenuh}`} />
              ) : i > aktif ? (
                <span className={s.isiSegmen} />
              ) : durasi > 0 ? (
                <span
                  key={aktif}
                  className={`${s.isiSegmen} ${s.isiBerjalan}`}
                  style={{
                    animationDuration: `${durasi}ms`,
                    animationPlayState: jeda ? "paused" : "running",
                  }}
                  onAnimationEnd={lanjut}
                />
              ) : (
                <span className={s.isiSegmen} style={{ width: `${progresMedia * 100}%` }} />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className={s.barisAtas}>
        <span className={s.namaAlbum}>{data.judul ?? ""}</span>
        <button type="button" className={s.tombolIkon} onClick={onKeAlbum} aria-label="Tutup slideshow dan lihat semua kenangan">
          ×
        </button>
      </div>

      <div className={s.panggungCerita}>
        {keluar && keluar.index !== aktif && (
          <TampilanSlide
            key={`keluar-${keluar.index}`}
            slide={slides[keluar.index]}
            kelas={keluar.arah === 1 ? s.keluarMaju : s.keluarMundur}
            aktif={false}
            jeda
            durasi={0}
            jumlahFoto={jumlahFoto}
            data={data}
          />
        )}
        <TampilanSlide
          key={`aktif-${aktif}`}
          slide={slide}
          kelas={arah === 1 ? s.masukMaju : s.masukMundur}
          aktif
          jeda={jeda}
          durasi={durasi}
          jumlahFoto={jumlahFoto}
          data={data}
          onProgres={setProgresMedia}
          onSelesai={lanjut}
          onKeAlbum={onKeAlbum}
          onUlang={() => pindah(0)}
        />

        {jeda && slide.tipe !== "penutup" && <div className={s.tandaJeda}>Dijeda</div>}
        {aktif === 0 && !keluar && (
          <p className={s.petunjukKetuk}>Ketuk kanan untuk lanjut, kiri untuk kembali. Tahan untuk berhenti sejenak.</p>
        )}
      </div>
    </div>
  );
}

type PropsSlide = {
  slide: Slide;
  kelas: string;
  aktif: boolean;
  jeda: boolean;
  durasi: number;
  jumlahFoto: number;
  data: DataKenangan;
  onProgres?: (n: number) => void;
  onSelesai?: () => void;
  onKeAlbum?: () => void;
  onUlang?: () => void;
};

function TampilanSlide(p: PropsSlide) {
  const { slide, kelas, aktif, jeda, durasi } = p;
  let isi: ReactNode = null;

  if (slide.tipe === "foto") {
    isi = (
      <Cetak miring={kemiringan(slide.urutan)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- link Supabase bertanda tangan */}
        <img
          src={slide.url}
          alt={`Foto ${slide.urutan + 1} dari ${p.jumlahFoto}`}
          className={`${s.gambarCerita} ${aktif ? s.kenBurns : ""}`}
          style={
            aktif
              ? {
                  transformOrigin: ASAL_ZOOM[slide.urutan % ASAL_ZOOM.length],
                  animationDuration: `${durasi + 1000}ms`,
                  animationPlayState: jeda ? "paused" : "running",
                }
              : { transformOrigin: ASAL_ZOOM[slide.urutan % ASAL_ZOOM.length], transform: "scale(1.07)" }
          }
          draggable={false}
        />
      </Cetak>
    );
  } else if (slide.tipe === "surat") {
    isi = <Surat salam={p.data.untuk ? `Untuk ${p.data.untuk}` : null} pesan={p.data.pesan} animasi={aktif} />;
  } else if (slide.tipe === "voice") {
    isi = <SlideSuara url={slide.url} aktif={aktif} jeda={jeda} onProgres={p.onProgres} onSelesai={p.onSelesai} />;
  } else if (slide.tipe === "video") {
    isi = <SlideVideo url={slide.url} aktif={aktif} jeda={jeda} onProgres={p.onProgres} onSelesai={p.onSelesai} />;
  } else {
    isi = <Penutup linkLagu={p.data.linkLagu} onKeAlbum={p.onKeAlbum} onUlang={p.onUlang} />;
  }

  return (
    <div className={`${s.slide} ${kelas}`} aria-hidden={!aktif}>
      {isi}
    </div>
  );
}

type PropsMedia = {
  url: string;
  aktif: boolean;
  jeda: boolean;
  onProgres?: (n: number) => void;
  onSelesai?: () => void;
};

function SlideSuara({ url, aktif, jeda, onProgres, onSelesai }: PropsMedia) {
  const ref = useRef<HTMLAudioElement>(null);
  const [main, setMain] = useState(false);
  const [waktu, setWaktu] = useState("0:00");

  useEffect(() => {
    const a = ref.current;
    if (!a || !aktif) return;
    if (jeda) a.pause();
    else a.play().catch(() => {});
  }, [aktif, jeda]);

  return (
    <div className={s.kartuSuara}>
      <p className={s.judulSuara}>Pesan suara untukmu</p>
      <button
        type="button"
        className={s.tombolPutar}
        aria-label={main ? "Jeda pesan suara" : "Putar pesan suara"}
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused) a.play().catch(() => {});
          else a.pause();
        }}
      >
        {main ? "❚❚" : "▶"}
      </button>
      <div className={`${s.gelombang} ${main ? s.gelombangAktif : ""}`} aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <p className={s.waktuSuara}>{waktu}</p>
      {aktif && (
        <audio
          ref={ref}
          src={url}
          preload="auto"
          onPlay={() => setMain(true)}
          onPause={() => setMain(false)}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (a.duration) onProgres?.(a.currentTime / a.duration);
            setWaktu(formatWaktu(a.currentTime));
          }}
          onEnded={onSelesai}
        />
      )}
    </div>
  );
}

function SlideVideo({ url, aktif, jeda, onProgres, onSelesai }: PropsMedia) {
  const ref = useRef<HTMLVideoElement>(null);
  const [bisu, setBisu] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || !aktif) return;
    if (jeda) {
      v.pause();
      return;
    }
    // Kalau browser menolak memutar dengan suara, putar tanpa suara dan tawarkan tombol.
    v.play().catch(() => {
      v.muted = true;
      setBisu(true);
      v.play().catch(() => {});
    });
  }, [aktif, jeda]);

  return (
    <Cetak miring={-0.8}>
      <video
        ref={ref}
        src={url}
        className={s.videoCerita}
        playsInline
        preload={aktif ? "auto" : "metadata"}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) onProgres?.(v.currentTime / v.duration);
        }}
        onEnded={onSelesai}
      />
      {aktif && bisu && (
        <button
          type="button"
          className={s.tombolSuara}
          onClick={() => {
            const v = ref.current;
            if (v) v.muted = false;
            setBisu(false);
          }}
        >
          Nyalakan suara
        </button>
      )}
    </Cetak>
  );
}

function Penutup({
  linkLagu,
  onKeAlbum,
  onUlang,
}: {
  linkLagu: string | null;
  onKeAlbum?: () => void;
  onUlang?: () => void;
}) {
  return (
    <div className={s.penutup}>
      <p className={s.tulisanBesar}>Dengan sayang</p>
      <p className={s.teksRedup}>
        Album ini bisa dibuka lagi kapan saja dengan menempelkan HP ke gantungan kuncinya.
      </p>
      <div className={s.kumpulanTombol}>
        <button type="button" className={s.tombolUtama} onClick={onKeAlbum}>
          Lihat semua kenangan
        </button>
        <button type="button" className={s.tombolKedua} onClick={onUlang}>
          Putar dari awal
        </button>
        {linkLagu && (
          <a className={s.tombolKedua} href={linkLagu} target="_blank" rel="noopener noreferrer">
            Dengarkan lagu kita
          </a>
        )}
      </div>
    </div>
  );
}

function formatWaktu(detik: number) {
  const m = Math.floor(detik / 60);
  const d = Math.floor(detik % 60);
  return `${m}:${d.toString().padStart(2, "0")}`;
}
