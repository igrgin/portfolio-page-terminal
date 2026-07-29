import type { Locale, LocalizedValue } from "./index";

export type UnknownRecord = Record<string, unknown>;

export const contactChannelKinds = [
  "email",
  "phone",
  "linkedin",
  "github",
  "other",
] as const;

export type ContactChannelKind = (typeof contactChannelKinds)[number];

export type ContactChannel = Readonly<{
  href: string;
  kind: ContactChannelKind;
  label: string;
}>;

export function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function publishedDocument(value: unknown): UnknownRecord | null {
  const candidate = record(value);
  const id = nonEmptyString(candidate?._id);
  return id && !id.startsWith("drafts.") ? candidate : null;
}

export function localizedStrings(
  value: unknown,
): LocalizedValue<string> | null {
  const candidate = record(value);
  const en = nonEmptyString(candidate?.en);
  const hr = nonEmptyString(candidate?.hr);
  return en && hr ? { en, hr } : null;
}

export function safeUrl(
  value: unknown,
  protocols: readonly string[],
): string | null {
  const url = nonEmptyString(value);
  if (!url) {
    return null;
  }

  try {
    return protocols.includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

export function normalizeContactChannels(
  value: unknown,
  locale: Locale,
): readonly ContactChannel[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const channels = value.map((entry) => {
    const channel = record(entry);
    const kind = nonEmptyString(channel?.kind);
    const label = localizedStrings(channel?.label);
    const href = safeUrl(channel?.href, ["https:", "mailto:", "tel:"]);

    return kind &&
      contactChannelKinds.includes(kind as ContactChannelKind) &&
      label &&
      href
      ? {
          href,
          kind: kind as ContactChannelKind,
          label: label[locale],
        }
      : null;
  });

  return channels.every(
    (channel): channel is ContactChannel => channel !== null,
  )
    ? channels
    : null;
}

type SanityEnvironment = Readonly<Record<string, string | undefined>>;

export function hasSanityConfiguration(
  environment: SanityEnvironment = process.env,
): boolean {
  const configuredKeys = [
    "NEXT_PUBLIC_SANITY_DATASET",
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SANITY_PROJECT_ID",
  ] as const;
  if (!configuredKeys.some((key) => environment[key] !== undefined)) {
    return false;
  }

  const projectId =
    environment.SANITY_PROJECT_ID ?? environment.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset =
    environment.SANITY_DATASET ??
    environment.NEXT_PUBLIC_SANITY_DATASET ??
    "production";

  if (
    !projectId ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-zA-Z0-9_-]+$/.test(dataset)
  ) {
    throw new Error(
      "Invalid Sanity configuration: check the project ID and dataset.",
    );
  }

  return true;
}

function sanityEndpoint(query: string): string | null {
  if (!hasSanityConfiguration()) {
    return null;
  }

  const projectId =
    process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset =
    process.env.SANITY_DATASET ??
    process.env.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const search = new URLSearchParams({ query });
  return `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?${search}`;
}

export async function loadSanityQuery(
  query: string,
  queryName: string,
): Promise<unknown> {
  const endpoint = sanityEndpoint(query);
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    cache: "force-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Sanity ${queryName} query failed with status ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();
  return record(payload)?.result;
}
