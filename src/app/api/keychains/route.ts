import { getUserId, handle } from "@/lib/api";
import { listOwned } from "@/lib/keychain-service";

// GET /api/keychains — daftar keychain milik user yang login
export const GET = handle(async (req) => listOwned(await getUserId(req)));
