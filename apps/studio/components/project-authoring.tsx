import type { Locale } from "@portfolio/content";
import { studioTheme, ThemeProvider } from "@sanity/ui";
import React, {
  createContext,
  type FocusEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type ObjectInputProps, useFormValue } from "sanity";

import { studioPreviewOrigin } from "../environment";
import {
  buildProjectPreviewUrl,
  type ProjectAuthoringTheme,
  readProjectAuthoringTheme,
  saveProjectAuthoringTheme,
} from "./project-authoring-state";
import { projectAuthoringCss } from "./project-authoring-styles";

type ProjectAuthoringLocaleContextValue = Readonly<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>;

const ProjectAuthoringLocaleContext =
  createContext<ProjectAuthoringLocaleContextValue | null>(null);

export function PairedLocalizedInput(props: ObjectInputProps) {
  const authoringLocale = useContext(ProjectAuthoringLocaleContext);

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const editables = Array.from(
      event.currentTarget.querySelectorAll(
        'input, textarea, [contenteditable="true"]',
      ),
    );
    const fieldIndex = editables.indexOf(event.target as Element);
    if (fieldIndex === 0) {
      authoringLocale?.setLocale("en");
    } else if (fieldIndex === 1) {
      authoringLocale?.setLocale("hr");
    }
  }

  if (!authoringLocale) {
    return props.renderDefault(props);
  }

  return (
    <div
      aria-label="Paired English and Croatian fields"
      className="project-authoring__pair"
      data-active-locale={authoringLocale.locale}
      onFocusCapture={handleFocus}
      role="group"
    >
      <div aria-live="polite" className="project-authoring__pair-status">
        <span>English + Hrvatski</span>
        <strong>
          {authoringLocale.locale === "en" ? "Editing EN" : "Uređivanje HR"}
        </strong>
      </div>
      <div>{props.renderDefault(props)}</div>
    </div>
  );
}

export function ProjectAuthoringCanvas({
  children,
  previewOrigin,
  previewSlug,
  projectTitle,
}: Readonly<{
  children: ReactNode;
  previewOrigin: string;
  previewSlug?: string;
  projectTitle?: string;
}>) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<ProjectAuthoringTheme>("light");
  const context = useMemo(() => ({ locale, setLocale }), [locale]);
  const previewUrl = buildProjectPreviewUrl(
    previewOrigin,
    previewSlug,
    locale,
  );

  useEffect(() => {
    try {
      const savedTheme = readProjectAuthoringTheme(window.localStorage);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch {
      // Storage can be unavailable in a privacy-restricted browser context.
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      saveProjectAuthoringTheme(window.localStorage, nextTheme);
    } catch {
      // The explicit choice still applies for the current editing session.
    }
  }

  return (
    <ThemeProvider scheme={theme} theme={studioTheme}>
      <ProjectAuthoringLocaleContext.Provider value={context}>
        <div
          className="project-authoring"
          data-authoring-theme={theme}
          data-testid="project-authoring-canvas"
        >
          <style>{projectAuthoringCss}</style>
          <section
            aria-label="Project authoring canvas"
            className="project-authoring__editor"
          >
            <header className="project-authoring__toolbar">
              <div>
                <strong>Paired Project canvas</strong>
                <span>Localized copy and shared canonical facts</span>
              </div>
              <button
                aria-label={`Use ${
                  theme === "light" ? "dark" : "light"
                } authoring theme`}
                aria-pressed={theme === "dark"}
                onClick={toggleTheme}
                type="button"
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>
            </header>
            <div className="project-authoring__form">{children}</div>
          </section>
          <aside
            aria-label="Persistent public Project preview"
            className="project-authoring__preview"
          >
            <header className="project-authoring__toolbar">
              <div>
                <strong>Live public composition</strong>
                <span>Responsive Project page</span>
              </div>
              <div
                aria-label="Preview language"
                className="project-authoring__controls"
              >
                <button
                  aria-pressed={locale === "en"}
                  aria-label="Preview in English"
                  onClick={() => setLocale("en")}
                  type="button"
                >
                  EN
                </button>
                <button
                  aria-pressed={locale === "hr"}
                  aria-label="Preview in Croatian"
                  onClick={() => setLocale("hr")}
                  type="button"
                >
                  HR
                </button>
                {previewUrl && (
                  <a
                    aria-label="Open public Project preview in a new tab"
                    className="project-authoring__open-preview"
                    href={previewUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    ↗
                  </a>
                )}
              </div>
            </header>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title={`Public Project preview: ${
                  projectTitle || "Untitled Project"
                }`}
              />
            ) : (
              <p className="project-authoring__preview-status" role="status">
                Add a canonical slug to open the public Project preview.
              </p>
            )}
          </aside>
        </div>
      </ProjectAuthoringLocaleContext.Provider>
    </ThemeProvider>
  );
}

export function ProjectAuthoringInput(props: ObjectInputProps) {
  const slugValue = useFormValue(["slug", "current"]);
  const titleValue = useFormValue(["title", "en"]);
  const previewSlug = nonEmptyString(slugValue);
  const projectTitle = nonEmptyString(titleValue);

  return (
    <ProjectAuthoringCanvas
      previewOrigin={studioPreviewOrigin}
      previewSlug={previewSlug}
      projectTitle={projectTitle}
    >
      {props.renderDefault(props)}
    </ProjectAuthoringCanvas>
  );
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}
