import { cookies } from "next/headers";

import {
  startDraftSession,
  type DraftCookieStore,
} from "../../../../lib/draft-session-handler";

export async function POST(request: Request): Promise<Response> {
  const store = await cookies();
  const cookieStore: DraftCookieStore = {
    delete: (name) => store.delete(name),
    set: ({ name, options, value }) => store.set(name, value, options),
  };
  return startDraftSession(request, {
    cookieStore,
    secret: process.env.DRAFT_MODE_SECRET ?? "",
  });
}
