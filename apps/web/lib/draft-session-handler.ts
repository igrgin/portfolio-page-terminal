import {
  draftSessionCookie,
  draftSessionCookieName,
  validateDraftAccessToken,
} from "./draft-session";

type DraftCookie = ReturnType<typeof draftSessionCookie>;

export type DraftCookieStore = Readonly<{
  delete: (name: string) => void;
  set: (cookie: DraftCookie) => void;
}>;

type StartDraftSessionOptions = Readonly<{
  cookieStore: DraftCookieStore;
  now?: Date;
  secret: string;
}>;

function securityHeaders() {
  return {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function safeDraftPath(value: FormDataEntryValue | null): string {
  if (
    typeof value === "string" &&
    value.length <= 500 &&
    /^\/draft\/(?:en|hr)(?:\/|$)/u.test(value) &&
    !value.includes("?") &&
    !value.includes("#") &&
    !value.includes("\\")
  ) {
    return value;
  }
  return "/draft/en/about";
}

export async function startDraftSession(
  request: Request,
  options: StartDraftSessionOptions,
): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Draft access denied.", {
      headers: securityHeaders(),
      status: 400,
    });
  }
  const token = form.get("token");
  if (typeof token !== "string" || token.length > 500) {
    return new Response("Draft access denied.", {
      headers: securityHeaders(),
      status: 401,
    });
  }
  const access = await validateDraftAccessToken(
    token,
    options.secret,
    options.now,
  );
  if (!access) {
    return new Response("Draft access denied.", {
      headers: securityHeaders(),
      status: 401,
    });
  }

  options.cookieStore.set(draftSessionCookie(token, access.expiresAt));
  return new Response(null, {
    headers: {
      ...securityHeaders(),
      Location: new URL(safeDraftPath(form.get("redirectTo")), request.url)
        .href,
    },
    status: 303,
  });
}

export function endDraftSession(
  requestUrl: string,
  cookieStore: DraftCookieStore,
): Response {
  cookieStore.delete(draftSessionCookieName);
  return new Response(null, {
    headers: {
      ...securityHeaders(),
      Location: new URL("/", requestUrl).href,
    },
    status: 303,
  });
}
