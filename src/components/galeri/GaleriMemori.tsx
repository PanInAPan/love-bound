"use client";

import { useCallback, useState } from "react";
import s from "./kelas";
import Cetak, { kemiringan } from "./Cetak";
import Cerita from "./Cerita";
import Album from "./Album";
import { labelSampul, type DataKenangan } from "./jenis";

type Tahap = "sampul" | "cerita" | "album";

// Alur halaman: sampul album → slideshow kenangan → album berisi semua foto.
export default function GaleriMemori({ data }: { data: DataKenangan }) {
  const [tahap, setTahap] = useState<Tahap>("sampul");
  const [membuka, setMembuka] = useState(false);
  const keAlbum = useCallback(() => setTahap("album"), []);
  const keCerita = useCallback(() => setTahap("cerita"), []);

  function bukaAlbum() {
    if (membuka) return;
    setMembuka(true);
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setTahap("cerita"), kurangiGerak ? 0 : 1050);
  }

  const adaSuara = data.voice.length > 0 || data.video.length > 0;

  return (
    <div className={s.akar}>
      {tahap === "sampul" && (
        <div className={s.panggungSampul}>
          {/* Halaman pertama yang terlihat saat sampul dibuka */}
          <div className={s.halamanPertama} aria-hidden>
            {data.foto[0] && (
              <Cetak miring={kemiringan(0)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- link Supabase bertanda tangan */}
                <img src={data.foto[0]} alt="" className={s.gambarCerita} />
              </Cetak>
            )}
          </div>

          <div className={`${s.sampul} ${membuka ? s.sampulTerbuka : ""}`}>
            <div className={s.label}>
              <p className={s.labelKecil}>{labelSampul(data.untuk)}</p>
              <h1 className={s.judul}>{data.judul ?? "Untukmu"}</h1>
            </div>
            <button type="button" className={s.tombolUtama} onClick={bukaAlbum} disabled={membuka}>
              Buka album
            </button>
            {adaSuara && <p className={s.petunjukSampul}>Nyalakan suara HP untuk mendengar pesan suara dan video.</p>}
          </div>
        </div>
      )}

      {tahap === "cerita" && <Cerita data={data} onKeAlbum={keAlbum} />}
      {tahap === "album" && <Album data={data} onPutarUlang={keCerita} />}
    </div>
  );
}
