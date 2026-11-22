import { redirect } from "next/navigation";

// Link di kartu petunjuk: /edit/<kode>?t=<edit_token> → dashboard (login Google dulu).
export default async function EditLink({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }>;
}) {
  const { code } = await params;
  const { t } = await searchParams;
  redirect(`/dashboard?code=${encodeURIComponent(code)}${t ? `&t=${encodeURIComponent(t)}` : ""}`);
}
