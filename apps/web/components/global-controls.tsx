"use client";

import type { Locale } from "@portfolio/content";
import React, { useEffect, useState } from "react";

import {
  resolveThemePreference,
  saveLocalePreference,
  saveThemePreference,
  type Theme,
} from "../lib/preferences";

const labels = {
  en: {
    changeTheme: "Change theme",
    dark: "Use dark theme",
    language: "Prikaži na hrvatskom",
    light: "Use light theme",
  },
  hr: {
    changeTheme: "Promijeni temu",
    dark: "Koristi tamnu temu",
    language: "Show in English",
    light: "Koristi svijetlu temu",
  },
} as const;

export function LanguagePreferenceLink({
  href,
  locale,
}: Readonly<{ href: string; locale: Locale }>) {
  const targetLocale = locale === "en" ? "hr" : "en";

  return (
    <a
      className="text-control"
      href={href}
      hrefLang={targetLocale}
      lang={targetLocale}
      onClick={() => {
        saveLocalePreference(window.localStorage, targetLocale);
      }}
    >
      {targetLocale.toUpperCase()}
      <span className="sr-only"> — {labels[locale].language}</span>
    </a>
  );
}

export function ThemeControl({ locale }: Readonly<{ locale: Locale }>) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const resolvedTheme = resolveThemePreference(
      window.localStorage,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    document.documentElement.dataset.theme = resolvedTheme;
    setTheme(resolvedTheme);
  }, []);

  function chooseTheme() {
    const currentTheme =
      theme ??
      resolveThemePreference(
        window.localStorage,
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    saveThemePreference(window.localStorage, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  }

  const controlLabel =
    theme === null
      ? labels[locale].changeTheme
      : theme === "dark"
        ? labels[locale].light
        : labels[locale].dark;

  return (
    <button
      aria-label={controlLabel}
      className="icon-control"
      onClick={chooseTheme}
      title={controlLabel}
      type="button"
    >
      <span aria-hidden="true">{theme === "light" ? "☼" : theme === "dark" ? "☾" : "◐"}</span>
    </button>
  );
}
