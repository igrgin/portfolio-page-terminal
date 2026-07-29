export const studioEnvironment = {
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "portfolio",
} as const;
