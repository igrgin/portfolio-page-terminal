import { cookies } from "next/headers";

import {
  endDraftSession,
  type DraftCookieStore,
} from "../../../../../lib/draft-session-handler";

export async function POST(request: Request): Promise<Response> {
  const store = await cookies();
  const cookieStore: DraftCookieStore = {
    delete: (name) => store.delete(name),
    set: ({ name, options, value }) => store.set(name, value, options),
  };
  return endDraftSession(request.url, cookieStore);
}
