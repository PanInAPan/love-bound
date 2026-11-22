import type { ReactNode } from "react";
import s from "./kelas";

type Props = {
  kecil?: string;
  judul: string;
  children?: ReactNode;
};

// Sampul album tanpa tombol buka: untuk album terkunci, masa aktif habis, atau saat memuat.
export default function SampulPesan({ kecil = "Album kenangan", judul, children }: Props) {
  return (
    <div className={s.akar}>
      <div className={s.panggungSampul}>
        <div className={s.sampul}>
          <div className={s.label}>
            <p className={s.labelKecil}>{kecil}</p>
            <h1 className={s.judul}>{judul}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
