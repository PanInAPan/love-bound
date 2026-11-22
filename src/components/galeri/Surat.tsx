import s from "./kelas";
import { paragraf } from "./jenis";

type Props = {
  salam?: string | null;
  pesan: string | null;
  animasi?: boolean;
};

// Surat di atas kertas bergaris. Saat animasi aktif, paragraf muncul satu per satu.
export default function Surat({ salam, pesan, animasi = false }: Props) {
  const daftar = paragraf(pesan);
  const panjang = (pesan?.length ?? 0) > 600;

  return (
    <div className={`${s.surat} ${panjang ? s.suratPanjang : ""}`} data-gulir>
      {salam && <p className={`${s.salam} ${animasi ? s.barisMuncul : ""}`}>{salam},</p>}
      <div className={s.isiSurat}>
        {daftar.map((p, i) => (
          <p
            key={i}
            className={animasi ? s.barisMuncul : undefined}
            style={animasi ? { animationDelay: `${0.5 + i * 0.7}s` } : undefined}
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
