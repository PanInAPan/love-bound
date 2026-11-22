import { getUserId, handle, readJson } from "@/lib/api";
import { ApiError, claim } from "@/lib/keychain-service";

// POST /api/keychains/claim  { "id": "DEMO01", "token": "<edit_token>" }
export const POST = handle(async (req) => {
  const userId = await getUserId(req);
  const { id, token } = await readJson<{ id?: string; token?: string }>(req);
  if (!id || !token) throw new ApiError(400, "id dan token wajib diisi");
  return claim(userId, id, token);
});
