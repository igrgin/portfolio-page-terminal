export const draftSessionCookieName = "__Host-portfolio-draft";
export const draftSessionMaximumSeconds = 15 * 60;

type DraftClockOptions = Readonly<{
  now?: Date;
  ttlSeconds?: number;
}>;

export type DraftAccess = Readonly<{
  batchRevision: string;
  expiresAt: number;
}>;

function assertSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error("DRAFT_MODE_SECRET must contain at least 32 characters.");
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null;
  }
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(
      value.replaceAll("-", "+").replaceAll("_", "/") + padding,
    );
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

function tokenPayload(expiresAtSeconds: number, batchRevision: string) {
  return `v1.${expiresAtSeconds}.${batchRevision}`;
}

export async function createDraftAccessToken(
  secret: string,
  batchRevision: string,
  options: DraftClockOptions = {},
): Promise<string> {
  assertSecret(secret);
  if (!/^[a-f0-9]{64}$/u.test(batchRevision)) {
    throw new Error("Draft access requires a valid batch revision fingerprint.");
  }
  const ttlSeconds = options.ttlSeconds ?? draftSessionMaximumSeconds;
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0 ||
    ttlSeconds > draftSessionMaximumSeconds
  ) {
    throw new Error("Draft access tokens may be valid for at most 15 minutes.");
  }
  const now = options.now ?? new Date();
  const expiresAtSeconds = Math.floor(now.valueOf() / 1_000) + ttlSeconds;
  const payload = tokenPayload(expiresAtSeconds, batchRevision);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function validateDraftAccessToken(
  token: string,
  secret: string,
  now = new Date(),
): Promise<DraftAccess | null> {
  try {
    assertSecret(secret);
  } catch {
    return null;
  }
  const [version, expiration, batchRevision, encodedSignature, ...rest] =
    token.split(".");
  if (
    rest.length > 0 ||
    version !== "v1" ||
    !/^\d+$/u.test(expiration ?? "") ||
    !/^[a-f0-9]{64}$/u.test(batchRevision ?? "")
  ) {
    return null;
  }
  const expiresAtSeconds = Number(expiration);
  const nowSeconds = Math.floor(now.valueOf() / 1_000);
  if (
    !Number.isSafeInteger(expiresAtSeconds) ||
    expiresAtSeconds <= nowSeconds ||
    expiresAtSeconds - nowSeconds > draftSessionMaximumSeconds
  ) {
    return null;
  }
  const signature = base64UrlToBytes(encodedSignature ?? "");
  if (!signature) {
    return null;
  }
  const payload = tokenPayload(expiresAtSeconds, batchRevision);
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    new Uint8Array(signature).buffer,
    new TextEncoder().encode(payload),
  );
  return valid
    ? {
        batchRevision,
        expiresAt: expiresAtSeconds * 1_000,
      }
    : null;
}

export function draftSessionCookie(
  token: string,
  expiresAt: number,
) {
  return {
    name: draftSessionCookieName,
    options: {
      expires: new Date(expiresAt),
      httpOnly: true as const,
      path: "/" as const,
      sameSite: "strict" as const,
      secure: true as const,
    },
    value: token,
  } as const;
}
