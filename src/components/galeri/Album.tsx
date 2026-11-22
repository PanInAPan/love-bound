"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./kelas";
import Cetak, { SudutFoto, kemiringan } from "./Cetak";
import Surat from "./Surat";
import { labelSampul, type DataKenangan } from "./jenis";

type Props = {
  data: DataKenangan;
  onPutarUlang: () => void;
};

// Semua isi album dalam satu halaman: surat, pesan suara, video, dan kisi foto.
export default function Album({ data, onPutarUlang }: Props) {
  const [dibuka, setDibuka] = useState<number | null>(null);
  const jumlah = data.foto.length;
  const kosong = !data.pesan && jumlah === 0 && data.video.length === 0 && data.voice.length === 0;

  const ganti = useCallback(
    (langkah: number) => setDibuka((i) => (i === null ? i : (i + langkah + jumlah) % jumlah)),
    [jumlah],
  );
  const tutup = useCallback(() => setDibuka(null), []);

  return (
    <div className={s.album}>
      <header className={s.kepalaAlbum}>
        <div className={s.label}>
          <p className={s.labelKecil}>{labelSampul(data.untuk)}</p>
          <h1 className={s.judul}>{data.judul ?? "Untukmu"}</h1>
        </div>
      </header>

      {kosong && <p className={s.kosong}>Album ini belum berisi kenangan.</p>}

      {data.pesan && <Surat pesan={data.pesan} />}

      {data.linkLagu && (
        <section className={s.bagian}>
          <h2 className={s.judulBagian}>Lagu kita</h2>
          <LaguTertanam url={data.linkLagu} />
        </section>
      )}

      {data.voice.length > 0 && (
        <section className={s.bagian}>
          <h2 className={s.judulBagian}>Pesan suara</h2>
          {data.voice.map((url) => (
            <audio key={url} src={url} controls preload="none" className={s.audioAlbum} />
          ))}
        </section>
      )}

      {data.video.length > 0 && (
        <section className={s.bagian}>
          <h2 className={s.judulBagian}>Video</h2>
          {data.video.map((url, i) => (
            <div key={url} className={s.bagian}>
              <Cetak miring={kemiringan(i + 2)} className={s.cetakLebar}>
                <video src={url} controls playsInline preload="metadata" className={s.videoAlbum} />
              </Cetak>
            </div>
          ))}
        </section>
      )}

      {jumlah > 0 && (
        <ul className={s.kisi}>
          {data.foto.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                className={`${s.cetak} ${s.cetakKecil}`}
                style={{ "--r": `${kemiringan(i)}deg` } as CSSProperties}
                onClick={() => setDibuka(i)}
                aria-label={`Buka foto ${i + 1} dari ${jumlah}`}
              >
                <SudutFoto />
                {/* eslint-disable-next-line @next/next/no-img-element -- link Supabase bertanda tangan */}
                <img src={url} alt="" loading="lazy" className={s.gambarKisi} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={s.aksiAlbum}>
        <button type="button" className={s.tombolUtama} onClick={onPutarUlang}>
          Putar slideshow lagi
        </button>
      </div>

      <p className={s.catatanKaki}>
        Album ini bisa dibuka lagi kapan saja dengan menempelkan HP ke gantungan kuncinya.
      </p>

      {dibuka !== null && <Lightbox foto={data.foto} index={dibuka} onTutup={tutup} onGanti={ganti} />}
    </div>
  );
}

// Pemutar Spotify/YouTube langsung di halaman; link lain tampil sebagai tombol.
function LaguTertanam({ url }: { url: string }) {
  const spotify = url.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/);
  if (spotify) {
    return (
      <iframe
        title="Lagu di Spotify"
        className={s.lagu}
        height={152}
        src={`https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`}
        allow="encrypted-media"
        loading="lazy"
      />
    );
  }
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (youtube) {
    return (
      <iframe
        title="Lagu di YouTube"
        className={s.lagu}
        style={{ aspectRatio: "16 / 9" }}
        src={`https://www.youtube.com/embed/${youtube[1]}`}
        allow="encrypted-media"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  return (
    <a className={s.tombolKedua} href={url} target="_blank" rel="noopener noreferrer">
      Dengarkan lagu kita
    </a>
  );
}

type PropsLightbox = {
  foto: string[];
  index: number;
  onTutup: () => void;
  onGanti: (langkah: number) => void;
};

function Lightbox({ foto, index, onTutup, onGanti }: PropsLightbox) {
  const tombolTutup = useRef<HTMLButtonElement>(null);
  const awalGeser = useRef<number | null>(null);

  useEffect(() => {
    tombolTutup.current?.focus();
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = sebelumnya;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onTutup();
      else if (e.key === "ArrowRight") onGanti(1);
      else if (e.key === "ArrowLeft") onGanti(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTutup, onGanti]);

  return (
    <div
      className={s.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} dari ${foto.length}`}
      onPointerDown={(e) => {
        awalGeser.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (awalGeser.current === null) return;
        const dx = e.clientX - awalGeser.current;
        awalGeser.current = null;
        if (foto.length > 1 && Math.abs(dx) > 50) onGanti(dx < 0 ? 1 : -1);
      }}
    >
      <div className={s.barisLightbox}>
        <span>
          {index + 1} dari {foto.length}
        </span>
        <button ref={tombolTutup} type="button" className={s.tombolIkon} onClick={onTutup} aria-label="Tutup foto">
          ×
        </button>
      </div>

      <div
        className={s.isiLightbox}
        onClick={(e) => {
          if (e.target === e.currentTarget) onTutup();
        }}
      >
        <Cetak key={index} miring={kemiringan(index)} className={s.cetakLightbox}>
          {/* eslint-disable-next-line @next/next/no-img-element -- link Supabase bertanda tangan */}
          <img src={foto[index]} alt={`Foto ${index + 1}`} className={s.gambarLightbox} draggable={false} />
        </Cetak>
      </div>

      {foto.length > 1 && (
        <div className={s.navLightbox}>
          <button type="button" className={s.tombolKedua} onClick={() => onGanti(-1)}>
            Sebelumnya
          </button>
          <button type="button" className={s.tombolKedua} onClick={() => onGanti(1)}>
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
