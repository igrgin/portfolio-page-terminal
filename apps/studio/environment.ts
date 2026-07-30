export const studioEnvironment = {
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "portfolio",
} as const;

function resolvePreviewOrigin(value: string | undefined): string {
  const url = new URL(value ?? "http://localhost:3000");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "SANITY_STUDIO_PREVIEW_ORIGIN must use the http or https protocol.",
    );
  }
  return url.origin;
}

export const studioPreviewOrigin = resolvePreviewOrigin(
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN,
);
