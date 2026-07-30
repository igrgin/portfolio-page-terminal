import { cookies } from "next/headers";

import { loadDraftBatchScope } from "./draft-content";
import {
  draftSessionCookieName,
  validateDraftAccessToken,
} from "./draft-session";
import type { DraftApplicationContext } from "./draft-application";

export async function loadDraftRequestContext(): Promise<DraftApplicationContext | null> {
  const secret = process.env.DRAFT_MODE_SECRET;
  const sanityToken = process.env.SANITY_API_READ_TOKEN;
  if (!secret || !sanityToken) {
    return null;
  }
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(draftSessionCookieName)?.value;
  if (!sessionToken) {
    return null;
  }
  const access = await validateDraftAccessToken(sessionToken, secret);
  if (!access) {
    return null;
  }
  const batch = await loadDraftBatchScope(
    access.batchRevision,
    sanityToken,
  );
  return batch
    ? {
        batchName: batch.name,
        documentIds: batch.documentIds,
        expiresAt: access.expiresAt,
        revision: batch.revision,
        token: sanityToken,
      }
    : null;
}
