import type { Locale } from "@portfolio/content";

export const projectAuthoringThemes = ["light", "dark"] as const;
export type ProjectAuthoringTheme =
  (typeof projectAuthoringThemes)[number];

export const projectAuthoringThemeStorageKey =
  "portfolio-studio-project-theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

function isProjectAuthoringTheme(
  value: string | null,
): value is ProjectAuthoringTheme {
  return projectAuthoringThemes.some((theme) => theme === value);
}

export function readProjectAuthoringTheme(
  storage: Pick<ThemeStorage, "getItem">,
): ProjectAuthoringTheme | null {
  const value = storage.getItem(projectAuthoringThemeStorageKey);
  return isProjectAuthoringTheme(value) ? value : null;
}

export function saveProjectAuthoringTheme(
  storage: Pick<ThemeStorage, "setItem">,
  theme: ProjectAuthoringTheme,
): void {
  storage.setItem(projectAuthoringThemeStorageKey, theme);
}

export function buildProjectPreviewUrl(
  origin: string,
  slug: string | undefined,
  locale: Locale,
): string | null {
  if (!slug) {
    return null;
  }

  const slugSegment = encodeURIComponent(slug);
  const path =
    locale === "en"
      ? `/en/projects/${slugSegment}`
      : `/hr/projekti/${slugSegment}`;
  return new URL(path, origin).toString();
}
