import { handle } from "@/lib/api";
import { ApiError, publicView } from "@/lib/keychain-service";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/public/:id — data slideshow, tanpa login (dipakai halaman /k/:id)
export const GET = handle<Ctx>(async (_req, { params }) => {
  const view = await publicView((await params).id);
  if (!view) throw new ApiError(404, "Keychain tidak ditemukan");
  return view;
});
