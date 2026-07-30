import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  PairedLocalizedInput,
  ProjectAuthoringCanvas,
  ProjectAuthoringInput,
} from "../apps/studio/components/project-authoring";
import {
  buildProjectPreviewUrl,
  projectAuthoringThemeStorageKey,
  readProjectAuthoringTheme,
  saveProjectAuthoringTheme,
} from "../apps/studio/components/project-authoring-state";
import { projectAuthoringCss } from "../apps/studio/components/project-authoring-styles";
import {
  localizedString,
  localizedText,
} from "../apps/studio/schemaTypes/localized";
import { project } from "../apps/studio/schemaTypes/project";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://studio.example.com",
});

Object.defineProperties(globalThis, {
  document: { configurable: true, value: dom.window.document },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  localStorage: { configurable: true, value: dom.window.localStorage },
  navigator: { configurable: true, value: dom.window.navigator },
  window: { configurable: true, value: dom.window },
});
Object.defineProperties(dom.window.HTMLElement.prototype, {
  attachEvent: { configurable: true, value: () => undefined },
  detachEvent: { configurable: true, value: () => undefined },
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("Project preview URLs preserve the canonical Project across locales", () => {
  assert.equal(
    buildProjectPreviewUrl(
      "https://portfolio.example.com/",
      "distributed-event-platform",
      "en",
    ),
    "https://portfolio.example.com/en/projects/distributed-event-platform",
  );
  assert.equal(
    buildProjectPreviewUrl(
      "https://portfolio.example.com",
      "distributed-event-platform",
      "hr",
    ),
    "https://portfolio.example.com/hr/projekti/distributed-event-platform",
  );
  assert.equal(
    buildProjectPreviewUrl(
      "https://portfolio.example.com",
      undefined,
      "en",
    ),
    null,
  );
  assert.equal(
    buildProjectPreviewUrl(
      "https://portfolio.example.com",
      "project/with spaces",
      "en",
    ),
    "https://portfolio.example.com/en/projects/project%2Fwith%20spaces",
  );
});

test("Project authoring theme persistence is explicit and isolated", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.equal(readProjectAuthoringTheme(storage), null);

  saveProjectAuthoringTheme(storage, "dark");

  assert.equal(readProjectAuthoringTheme(storage), "dark");
  assert.equal(values.get(projectAuthoringThemeStorageKey), "dark");
  assert.equal(values.get("portfolio-theme"), undefined);

  values.set(projectAuthoringThemeStorageKey, "sepia");
  assert.equal(readProjectAuthoringTheme(storage), null);
});

test("keyboard focus and preview controls keep the editing locale synchronized", () => {
  const pairedInputProps = {
    renderDefault: () => (
      <>
        <input aria-label="English title" />
        <input aria-label="Croatian title" />
      </>
    ),
  };

  const view = render(
    <ProjectAuthoringCanvas
      previewOrigin="https://portfolio.example.com"
      previewSlug="distributed-event-platform"
      projectTitle="Distributed event platform"
    >
      <PairedLocalizedInput {...(pairedInputProps as never)} />
    </ProjectAuthoringCanvas>,
  );

  const englishControl = view.getByRole("button", {
    name: "Preview in English",
  });
  const croatianControl = view.getByRole("button", {
    name: "Preview in Croatian",
  });
  const preview = view.getByTitle(
    "Public Project preview: Distributed event platform",
  );

  assert.equal(englishControl.getAttribute("aria-pressed"), "true");
  assert.match(preview.getAttribute("src") ?? "", /\/en\/projects\//);

  fireEvent.focusIn(view.getByRole("textbox", { name: "Croatian title" }));

  assert.equal(croatianControl.getAttribute("aria-pressed"), "true");
  assert.match(preview.getAttribute("src") ?? "", /\/hr\/projekti\//);

  fireEvent.click(englishControl);

  assert.equal(englishControl.getAttribute("aria-pressed"), "true");
  assert.match(preview.getAttribute("src") ?? "", /\/en\/projects\//);
});

test("keyboard traversal covers theme, paired copy, shared facts, and preview controls", async () => {
  const user = userEvent.setup({ document: dom.window.document });
  const view = render(
    <ProjectAuthoringCanvas
      previewOrigin="https://portfolio.example.com"
      previewSlug="distributed-event-platform"
      projectTitle="Distributed event platform"
    >
      <PairedLocalizedInput
        {...({
          renderDefault: () => (
            <>
              <input aria-label="English summary" />
              <input aria-label="Croatian summary" />
            </>
          ),
        } as never)}
      />
      <input aria-label="Canonical slug" />
    </ProjectAuthoringCanvas>,
  );
  const preview = view.getByTitle(
    "Public Project preview: Distributed event platform",
  );

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("button", { name: "Use dark authoring theme" }),
  );
  await user.keyboard("{Enter}");
  assert.equal(
    localStorage.getItem(projectAuthoringThemeStorageKey),
    "dark",
  );

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("textbox", { name: "English summary" }),
  );
  assert.match(preview.getAttribute("src") ?? "", /\/en\/projects\//);

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("textbox", { name: "Croatian summary" }),
  );
  assert.match(preview.getAttribute("src") ?? "", /\/hr\/projekti\//);

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("textbox", { name: "Canonical slug" }),
  );

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("button", { name: "Preview in English" }),
  );
  await user.keyboard("{Enter}");
  assert.match(preview.getAttribute("src") ?? "", /\/en\/projects\//);

  await user.tab();
  assert.equal(
    document.activeElement,
    view.getByRole("button", { name: "Preview in Croatian" }),
  );
  await user.keyboard(" ");
  assert.match(preview.getAttribute("src") ?? "", /\/hr\/projekti\//);
});

test("paired localized inputs leave non-Project forms unchanged", () => {
  const view = render(
    <PairedLocalizedInput
      {...({
        renderDefault: () => <input aria-label="Standalone title" />,
      } as never)}
    />,
  );

  assert.equal(
    view.queryByRole("group", {
      name: "Paired English and Croatian fields",
    }),
    null,
  );
  assert.ok(view.getByRole("textbox", { name: "Standalone title" }));
});

test("authoring theme controls persist without changing visitor preferences", () => {
  const view = render(
    <ProjectAuthoringCanvas
      previewOrigin="https://portfolio.example.com"
      previewSlug="distributed-event-platform"
      projectTitle="Distributed event platform"
    >
      <p>Project form</p>
    </ProjectAuthoringCanvas>,
  );

  const themeControl = view.getByRole("button", {
    name: "Use dark authoring theme",
  });
  fireEvent.click(themeControl);

  assert.equal(
    view
      .getByTestId("project-authoring-canvas")
      .getAttribute("data-authoring-theme"),
    "dark",
  );
  assert.equal(
    localStorage.getItem(projectAuthoringThemeStorageKey),
    "dark",
  );
  assert.equal(localStorage.getItem("portfolio-theme"), null);

  view.unmount();
  const restoredView = render(
    <ProjectAuthoringCanvas
      previewOrigin="https://portfolio.example.com"
      previewSlug="distributed-event-platform"
    >
      <p>Project form</p>
    </ProjectAuthoringCanvas>,
  );

  assert.equal(
    restoredView
      .getByTestId("project-authoring-canvas")
      .getAttribute("data-authoring-theme"),
    "dark",
  );
  assert.equal(document.documentElement.dataset.theme, undefined);
});

test("the real preview remains in the responsive stacked Project workflow", () => {
  assert.match(
    projectAuthoringCss,
    /@media \(max-width: 70rem\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(projectAuthoringCss, /overflow-x: hidden/);
  assert.match(projectAuthoringCss, /min-height: min\(70vh, 48rem\)/);
  assert.doesNotMatch(projectAuthoringCss, /display:\s*none[^}]*preview/);
  assert.doesNotMatch(projectAuthoringCss, /order:\s*-1/);
  assert.doesNotMatch(projectAuthoringCss, /\.project-authoring button,/);

  const view = render(
    <ProjectAuthoringCanvas
      previewOrigin="https://portfolio.example.com"
      previewSlug="distributed-event-platform"
    >
      <PairedLocalizedInput
        {...({
          renderDefault: () => (
            <>
              <input aria-label="English outcome" />
              <input aria-label="Croatian outcome" />
            </>
          ),
        } as never)}
      />
      <input aria-label="Shared Project status" />
    </ProjectAuthoringCanvas>,
  );
  const workflow = view.getByTestId("project-authoring-canvas");
  const editor = view.getByRole("region", {
    name: "Project authoring canvas",
  });
  const preview = view.getByRole("complementary", {
    name: "Persistent public Project preview",
  });

  assert.ok(
    workflow.compareDocumentPosition(editor) &
      dom.window.Node.DOCUMENT_POSITION_CONTAINED_BY,
  );
  assert.ok(
    workflow.compareDocumentPosition(preview) &
      dom.window.Node.DOCUMENT_POSITION_CONTAINED_BY,
  );
  assert.ok(
    editor.compareDocumentPosition(preview) &
      dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
  );
  assert.ok(view.getByRole("textbox", { name: "English outcome" }));
  assert.ok(view.getByRole("textbox", { name: "Croatian outcome" }));
  assert.ok(view.getByRole("textbox", { name: "Shared Project status" }));
  assert.ok(view.getByRole("button", { name: "Preview in English" }));
  assert.ok(view.getByRole("button", { name: "Preview in Croatian" }));
});

test("the Project schema separates paired copy from shared facts", () => {
  assert.deepEqual(
    project.groups?.map(({ name, title }) => ({ name, title })),
    [
      { name: "localized", title: "Paired EN / HR copy" },
      { name: "shared", title: "Shared canonical facts" },
    ],
  );

  const fields = new Map(
    project.fields.map((field) => [field.name, field.group]),
  );
  assert.equal(fields.get("title"), "localized");
  assert.equal(fields.get("outcome"), "localized");
  assert.equal(fields.get("metadataOverride"), "localized");
  assert.equal(fields.get("slug"), "shared");
  assert.equal(fields.get("status"), "shared");
  assert.equal(fields.get("skills"), "shared");
  assert.equal(fields.get("heroMedia"), "shared");
  assert.equal(fields.get("publishSafe"), "shared");

  assert.equal(localizedString.options?.columns, 2);
  assert.equal(localizedText.options?.columns, 2);
  assert.equal(
    localizedString.components?.input?.name,
    PairedLocalizedInput.name,
  );
  assert.equal(
    localizedText.components?.input?.name,
    PairedLocalizedInput.name,
  );
  assert.equal(
    project.components?.input?.name,
    ProjectAuthoringInput.name,
  );
});
