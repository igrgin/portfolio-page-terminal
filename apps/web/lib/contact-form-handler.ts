import {
  CONTACT_FORM_MAX_BODY_BYTES,
  type ContactFormResponse,
  type ContactSubmission,
  isRecord,
  validateContactSubmission,
} from "./contact-form-contract";

const RATE_WINDOW_MS = 60_000;
const CLIENT_ATTEMPT_LIMIT = 5;
const ROUTE_ATTEMPT_LIMIT = 50;

type RateLimitResult = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

export type ContactRateLimiter = Readonly<{
  check(clientToken: string): RateLimitResult;
}>;

type ContactFormHandlerDependencies = Readonly<{
  deliver(submission: ContactSubmission): Promise<void>;
  ipTokenSecret: string;
  rateLimiter: ContactRateLimiter;
}>;

type MemoryRateLimiterOptions = Readonly<{
  clientAttemptLimit?: number;
  now?: () => number;
  routeAttemptLimit?: number;
}>;

type FixedWindow = {
  count: number;
  startedAt: number;
};

function jsonResponse(
  body: ContactFormResponse,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function consumeWindow(
  windows: Map<string, FixedWindow>,
  key: string,
  limit: number,
  now: number,
): RateLimitResult {
  const current = windows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    windows.set(key, { count: 1, startedAt: now });
    return { allowed: true, retryAfterSeconds: 60 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1_000),
      ),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 60 };
}

export function createMemoryContactRateLimiter(
  options: MemoryRateLimiterOptions = {},
): ContactRateLimiter {
  const clientWindows = new Map<string, FixedWindow>();
  const routeWindows = new Map<string, FixedWindow>();
  const now = options.now ?? Date.now;
  const clientAttemptLimit =
    options.clientAttemptLimit ?? CLIENT_ATTEMPT_LIMIT;
  const routeAttemptLimit = options.routeAttemptLimit ?? ROUTE_ATTEMPT_LIMIT;
  let lastCleanup = now();

  return {
    check(clientToken) {
      const currentTime = now();
      if (currentTime - lastCleanup >= RATE_WINDOW_MS) {
        for (const [token, window] of clientWindows) {
          if (currentTime - window.startedAt >= RATE_WINDOW_MS) {
            clientWindows.delete(token);
          }
        }
        lastCleanup = currentTime;
      }

      const client = consumeWindow(
        clientWindows,
        clientToken,
        clientAttemptLimit,
        currentTime,
      );
      const route = consumeWindow(
        routeWindows,
        "contact-route",
        routeAttemptLimit,
        currentTime,
      );
      return client.allowed && route.allowed
        ? { allowed: true, retryAfterSeconds: 60 }
        : {
            allowed: false,
            retryAfterSeconds: Math.max(
              client.allowed ? 0 : client.retryAfterSeconds,
              route.allowed ? 0 : route.retryAfterSeconds,
            ),
          };
    },
  };
}

export async function privacyPreservingIpToken(
  ipAddress: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(ipAddress),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function boundedRequestText(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > CONTACT_FORM_MAX_BODY_BYTES
  ) {
    return null;
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return text + decoder.decode();
    }

    byteLength += value.byteLength;
    if (byteLength > CONTACT_FORM_MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function requestIpAddress(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

function crossOriginBrowserRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (
    (origin !== null && origin !== requestOrigin) || fetchSite === "cross-site"
  );
}

function rateLimitedResponse(rateLimit: RateLimitResult): Response {
  return jsonResponse(
    {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      status: "rate_limited",
    },
    {
      headers: {
        "retry-after": String(rateLimit.retryAfterSeconds),
      },
      status: 429,
    },
  );
}

export function createContactFormHandler({
  deliver,
  ipTokenSecret,
  rateLimiter,
}: ContactFormHandlerDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    if (crossOriginBrowserRequest(request)) {
      return jsonResponse({ status: "forbidden" }, { status: 403 });
    }

    const clientToken = await privacyPreservingIpToken(
      requestIpAddress(request),
      ipTokenSecret,
    );
    const rateLimit = rateLimiter.check(clientToken);

    if (
      request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
      "application/json"
    ) {
      if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
      }
      return jsonResponse(
        { status: "unsupported_media_type" },
        { status: 415 },
      );
    }

    const bodyText = await boundedRequestText(request);
    if (bodyText === null) {
      if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
      }
      return jsonResponse({ status: "too_large" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
      }
      return jsonResponse(
        {
          fieldErrors: {},
          formError: "invalid_request",
          status: "invalid",
        },
        { status: 400 },
      );
    }

    if (
      isRecord(body) &&
      typeof body.website === "string" &&
      body.website.trim()
    ) {
      return jsonResponse({ status: "accepted" });
    }

    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit);
    }

    const validation = validateContactSubmission(body);
    if (!validation.success) {
      return jsonResponse(
        {
          fieldErrors: validation.fieldErrors,
          ...(validation.formError
            ? { formError: validation.formError }
            : {}),
          status: "invalid",
        },
        { status: 400 },
      );
    }

    try {
      await deliver(validation.data);
      return jsonResponse({ status: "accepted" });
    } catch {
      return jsonResponse({ status: "ambiguous" }, { status: 502 });
    }
  };
}
