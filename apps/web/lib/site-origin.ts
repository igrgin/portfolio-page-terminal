const localSiteOrigin = new URL("http://localhost:3000");

export function siteOrigin({
  required = false,
}: Readonly<{ required?: boolean }> = {}): URL {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (!configuredOrigin) {
    if (required) {
      throw new Error(
        "NEXT_PUBLIC_SITE_ORIGIN is required for a configured content build.",
      );
    }
    return localSiteOrigin;
  }

  const origin = new URL(configuredOrigin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    (required && origin.protocol !== "https:") ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_ORIGIN must be an HTTPS origin without a path, query, or fragment for configured builds.",
    );
  }

  return origin;
}

export function absoluteSiteUrl(path: string, origin: URL): string {
  return new URL(path, origin).toString();
}
