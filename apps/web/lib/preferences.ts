import type { Locale } from "@portfolio/content";

export type Theme = "dark" | "light";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export const localeStorageKey = "portfolio-locale";
export const themeStorageKey = "portfolio-theme";
export const themes = ["dark", "light"] as const satisfies readonly Theme[];

function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

export function themeBootstrapScript(): string {
  const key = JSON.stringify(themeStorageKey);
  const allowedThemes = JSON.stringify(themes);

  return `(function(){try{var value=localStorage.getItem(${key});var allowed=${allowedThemes};var theme=allowed.indexOf(value)>=0?value:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=theme;}catch(error){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();`;
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "hr";
}

export function resolveThemePreference(
  storage: Pick<PreferenceStorage, "getItem">,
  systemPrefersDark: boolean,
): Theme {
  try {
    const savedTheme = storage.getItem(themeStorageKey);
    if (isTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // Storage can be unavailable. The non-persisted system choice remains usable.
  }

  return systemPrefersDark ? "dark" : "light";
}

export function saveThemePreference(
  storage: Pick<PreferenceStorage, "setItem">,
  theme: Theme,
) {
  try {
    storage.setItem(themeStorageKey, theme);
    return true;
  } catch {
    return false;
  }
}

export function readLocalePreference(
  storage: Pick<PreferenceStorage, "getItem">,
): Locale | null {
  try {
    const locale = storage.getItem(localeStorageKey);
    return isLocale(locale) ? locale : null;
  } catch {
    return null;
  }
}

export function saveLocalePreference(
  storage: Pick<PreferenceStorage, "setItem">,
  locale: Locale,
) {
  try {
    storage.setItem(localeStorageKey, locale);
    return true;
  } catch {
    return false;
  }
}
