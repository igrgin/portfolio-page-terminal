import type { Locale, LocalizedValue } from "./index";

export type UnknownRecord = Record<string, unknown>;

export const requiredContactChannelKinds = [
  "email",
  "linkedin",
  "github",
  "phone",
] as const;

export const contactChannelKinds = [
  ...requiredContactChannelKinds,
  "other",
] as const;

export type ContactChannelKind = (typeof contactChannelKinds)[number];

export type ContactChannel = Readonly<{
  href: string;
  kind: ContactChannelKind;
  label: string;
}>;

export function hasRequiredContactChannelOrder(
  channels: readonly Readonly<{ kind?: unknown }>[],
): boolean {
  return (
    channels.length >= requiredContactChannelKinds.length &&
    requiredContactChannelKinds.every(
      (kind, index) => channels[index]?.kind === kind,
    )
  );
}

const contactChannelProtocols: Readonly<
  Record<ContactChannelKind, readonly string[]>
> = {
  email: ["mailto:"],
  github: ["https:"],
  linkedin: ["https:"],
  other: ["https:"],
  phone: ["tel:"],
};

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
    const supportedKind =
      kind && contactChannelKinds.includes(kind as ContactChannelKind)
        ? (kind as ContactChannelKind)
        : null;
    const href = supportedKind
      ? safeUrl(channel?.href, contactChannelProtocols[supportedKind])
      : null;

    return supportedKind && label && href
      ? {
          href,
          kind: supportedKind,
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

export type SanityEnvironment = Readonly<Record<string, string | undefined>>;

type SanityFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type SanityQueryBaseOptions = Readonly<{
  environment?: SanityEnvironment;
  fetcher?: SanityFetcher;
}>;

export type SanityQueryOptions =
  | (SanityQueryBaseOptions &
      Readonly<{
        mode?: "published";
      }>)
  | (SanityQueryBaseOptions &
      Readonly<{
        documentIds: readonly string[];
        mode: "draft";
        token: string;
      }>);

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

function sanityEndpoint(
  query: string,
  environment: SanityEnvironment,
  perspective: "previewDrafts" | "published",
): string | null {
  if (!hasSanityConfiguration(environment)) {
    return null;
  }

  const projectId =
    environment.SANITY_PROJECT_ID ??
    environment.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset =
    environment.SANITY_DATASET ??
    environment.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const search = new URLSearchParams({
    query,
    ...(perspective === "previewDrafts" ? { perspective } : {}),
  });
  const host =
    perspective === "previewDrafts"
      ? `${projectId}.api.sanity.io`
      : `${projectId}.apicdn.sanity.io`;
  return `https://${host}/v2025-02-19/data/query/${dataset}?${search}`;
}

function draftQuery(query: string): string {
  return query
    .replace(
      /\s*&&\s*!\(_id in path\("drafts\.\*\*"\)\)/gu,
      "",
    )
    .replace(
      /!\(_id in path\("drafts\.\*\*"\)\)\s*&&\s*/gu,
      "",
    )
    .replace(/!\(_id in path\("drafts\.\*\*"\)\)/gu, "true");
}

function normalizedDraftValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizedDraftValue);
  }
  const object = record(value);
  if (!object) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(object).map(([key, child]) => [
      key,
      key === "_id" && typeof child === "string"
        ? child.replace(/^drafts\./, "")
        : normalizedDraftValue(child),
    ]),
  );
}

function contentId(value: unknown): string | null {
  const id = nonEmptyString(record(value)?._id);
  return id ? id.replace(/^drafts\./, "") : null;
}

export function overlayBatchDrafts(
  published: unknown,
  preview: unknown,
  documentIds: readonly string[],
): unknown {
  const allowedIds = new Set(
    documentIds.map((id) => id.replace(/^drafts\./, "")),
  );

  function overlay(publicValue: unknown, previewValue: unknown): unknown {
    const previewId = contentId(previewValue);
    if (previewId) {
      return allowedIds.has(previewId)
        ? normalizedDraftValue(previewValue)
        : publicValue;
    }
    if (Array.isArray(publicValue) || Array.isArray(previewValue)) {
      const publicEntries = Array.isArray(publicValue) ? publicValue : [];
      const previewEntries = Array.isArray(previewValue) ? previewValue : [];
      const merged = [...publicEntries];
      for (const previewEntry of previewEntries) {
        const id = contentId(previewEntry);
        if (!id || !allowedIds.has(id)) {
          continue;
        }
        const publicIndex = merged.findIndex(
          (entry) => contentId(entry) === id,
        );
        if (publicIndex >= 0) {
          merged[publicIndex] = normalizedDraftValue(previewEntry);
        } else {
          merged.push(normalizedDraftValue(previewEntry));
        }
      }
      return merged;
    }
    const publicObject = record(publicValue);
    const previewObject = record(previewValue);
    if (publicObject || previewObject) {
      const keys = new Set([
        ...Object.keys(publicObject ?? {}),
        ...Object.keys(previewObject ?? {}),
      ]);
      return Object.fromEntries(
        [...keys].map((key) => [
          key,
          overlay(publicObject?.[key], previewObject?.[key]),
        ]),
      );
    }
    return publicValue;
  }

  return overlay(published, preview);
}

async function fetchSanityResult(
  endpoint: string,
  queryName: string,
  fetcher: SanityFetcher,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetcher(endpoint, init);
  if (!response.ok) {
    throw new Error(
      `Sanity ${queryName} query failed with status ${response.status}.`,
    );
  }
  const payload: unknown = await response.json();
  return record(payload)?.result;
}

export async function loadSanityQuery(
  query: string,
  queryName: string,
  options: SanityQueryOptions = {},
): Promise<unknown> {
  const environment = options.environment ?? process.env;
  const publishedEndpoint = sanityEndpoint(
    query,
    environment,
    "published",
  );
  if (!publishedEndpoint) {
    return null;
  }
  const fetcher = options.fetcher ?? fetch;
  const published = await fetchSanityResult(
    publishedEndpoint,
    queryName,
    fetcher,
    {
      cache: "force-cache",
      headers: { Accept: "application/json" },
    },
  );
  if (options.mode !== "draft") {
    return published;
  }
  if (!nonEmptyString(options.token) || options.documentIds.length === 0) {
    throw new Error("Draft Mode requires a server-side token and batch scope.");
  }
  const previewEndpoint = sanityEndpoint(
    draftQuery(query),
    environment,
    "previewDrafts",
  );
  if (!previewEndpoint) {
    return null;
  }
  const preview = await fetchSanityResult(
    previewEndpoint,
    queryName,
    fetcher,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${options.token}`,
      },
    },
  );
  return overlayBatchDrafts(published, preview, options.documentIds);
}
