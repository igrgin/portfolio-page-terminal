/**
 * PROTOTYPE — throw away after the authoring direction is chosen.
 * Three variants of the Project case-study editor, switchable via ?variant=,
 * on the existing Vite prototype route.
 */
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles.css";

const variants = [
  { key: "a", name: "Paired canvas" },
  { key: "b", name: "Guided pass" },
  { key: "c", name: "Outline + preview" },
];

const project = {
  title: { en: "Distributed event platform", hr: "Platforma za distribuirane evente" },
  summary: {
    en: "Observable, recoverable event processing as workload and ownership grow.",
    hr: "Pouzdana obrada evenata uz jasan observability kako rastu workload i ownership.",
  },
  role: { en: "Technical lead · architecture and delivery", hr: "Tech lead · arhitektura i delivery" },
  slug: "distributed-event-platform",
  status: "Draft",
  updated: "2 minutes ago",
  tech: ["TypeScript", "Go", "Kafka", "PostgreSQL", "OpenTelemetry", "Kubernetes"],
};

const narrative = [
  ["Context / problem", "Why the system existed and what had become unreliable.", "Zašto je sustav postojao i što je postalo nepouzdano."],
  ["Constraints", "At-least-once delivery, changing schemas, and shared ownership.", "At-least-once delivery, promjene schema i podijeljeni ownership."],
  ["Approach", "Idempotent consumers, visible retries, and explicit event contracts.", "Idempotent consumers, vidljivi retryji i eksplicitni event contracti."],
  ["Outcome / impact", "Predictable recovery and clearer operational responsibility.", "Predvidiv recovery i jasnija operativna odgovornost."],
  ["Lessons", "Retries are product behavior, not an implementation detail.", "Retryji su ponašanje proizvoda, a ne implementation detail."],
];

const mermaidSource = `sequenceDiagram
  participant API
  participant Queue
  participant Worker
  API->>Queue: publish(command)
  Queue->>Worker: deliver(event)
  Worker->>Worker: check idempotency key
  Worker-->>Queue: acknowledge`;

function usePrototype() {
  const getVariant = () => {
    const value = new URLSearchParams(window.location.search).get("variant");
    return variants.some((item) => item.key === value) ? value : "a";
  };
  const [variant, setVariantState] = useState(getVariant);
  const [scenario, setScenario] = useState("ready");
  const [locale, setLocale] = useState("en");
  const [step, setStep] = useState(0);
  const [section, setSection] = useState("Narrative");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => setVariantState(getVariant());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setVariant = (next) => {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", next);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    setVariantState(next);
    setPreviewOpen(false);
  };

  return {
    variant,
    setVariant,
    scenario,
    setScenario,
    locale,
    setLocale,
    step,
    setStep,
    section,
    setSection,
    previewOpen,
    setPreviewOpen,
  };
}

function Icon({ children }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
}

function StatusDot({ tone = "ok" }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}

function AppHeader({ state }) {
  const issueCount = state.scenario === "failure" ? 3 : 0;
  const openPreview = () => {
    if (state.variant === "a") state.setPreviewOpen(true);
    if (state.variant === "b") state.setStep(4);
  };
  const previewLabel =
    state.variant === "b" ? "Open review" : state.variant === "c" ? "Preview visible" : "Preview";
  return (
    <header className="app-header">
      <a className="brand" href="#project">
        <span className="brand__mark">S</span>
        <span>
          <strong>Portfolio Content</strong>
          <small>Project workspace</small>
        </span>
      </a>
      <div className="header-status">
        <span className="save-status"><StatusDot /> Saved {project.updated}</span>
        <button
          className={`scenario-toggle ${state.scenario === "failure" ? "is-active" : ""}`}
          type="button"
          onClick={() => state.setScenario(state.scenario === "ready" ? "failure" : "ready")}
        >
          <Icon>⚠</Icon>
          {state.scenario === "ready" ? "Test failure state" : `${issueCount} blocking issues`}
        </button>
        <button className="preview-button" type="button" onClick={openPreview}>
          <Icon>◉</Icon> {previewLabel}
        </button>
        <button className="publish-button" type="button" disabled={issueCount > 0}>
          {issueCount > 0 ? "Publish blocked" : "Review & publish"}
        </button>
        <button className="avatar" type="button" aria-label="Owner menu">IG</button>
      </div>
    </header>
  );
}

function ProjectHeader({ compact = false }) {
  return (
    <div className={`project-header ${compact ? "project-header--compact" : ""}`}>
      <a href="#projects" className="back-link">← Projects</a>
      <div className="project-heading">
        <span className="doc-icon">P</span>
        <div>
          <span className="eyebrow">FULL CASE STUDY · DRAFT</span>
          <h1>{project.title.en}</h1>
          <p>/{project.slug} · Last published 12 days ago</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, locale, required = false, multiline = false, issue = false, hint }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <label className={`field ${issue ? "field--issue" : ""}`}>
      <span className="field__label">
        {label} {required && <b>Required</b>}
        {locale && <em>{locale.toUpperCase()}</em>}
      </span>
      <Tag value={value} rows={multiline ? 3 : undefined} readOnly aria-invalid={issue || undefined} />
      {hint && <small>{hint}</small>}
      {issue && <small className="error-text">Croatian value is required before publishing.</small>}
    </label>
  );
}

function LocaleHeading({ locale, complete = true }) {
  return (
    <div className="locale-heading">
      <span className={`flag flag--${locale}`}>{locale.toUpperCase()}</span>
      <strong>{locale === "en" ? "English" : "Hrvatski"}</strong>
      <span className={complete ? "complete" : "incomplete"}>
        <StatusDot tone={complete ? "ok" : "danger"} />
        {complete ? "Complete" : "Needs attention"}
      </span>
    </div>
  );
}

function ValidationPanel({ failure }) {
  return (
    <aside className="validation-panel">
      <div className="panel-title">
        <span>
          <small>RELEASE READINESS</small>
          <strong>{failure ? "3 issues to fix" : "Ready for review"}</strong>
        </span>
        <span className={`score ${failure ? "score--bad" : ""}`}>{failure ? "82" : "100"}</span>
      </div>
      <div className="check-list">
        <div><StatusDot /><span><strong>Core details</strong><small>EN + HR complete</small></span></div>
        <div><StatusDot tone={failure ? "danger" : "ok"} /><span><strong>Localized narrative</strong><small>{failure ? "HR outcome is missing" : "5 paired sections"}</small></span></div>
        <div><StatusDot /><span><strong>Technologies</strong><small>6 evidence links</small></span></div>
        <div><StatusDot tone={failure ? "danger" : "ok"} /><span><strong>Media accessibility</strong><small>{failure ? "1 missing HR alt text" : "2 assets described"}</small></span></div>
        <div><StatusDot tone={failure ? "danger" : "ok"} /><span><strong>Diagram build</strong><small>{failure ? "Syntax error · line 7" : "Light + dark SVG valid"}</small></span></div>
        <div><StatusDot /><span><strong>External links</strong><small>Repository verified</small></span></div>
      </div>
      {failure ? (
        <div className="failure-note">
          <strong>Published version is safe</strong>
          <p>These draft errors block a new release. The current public case study and last valid diagram stay unchanged.</p>
        </div>
      ) : (
        <div className="success-note">
          <strong>Both localized versions match</strong>
          <p>Factual coverage and required assets are complete. Open Review to compare public previews.</p>
        </div>
      )}
    </aside>
  );
}

function NarrativePair({ failure }) {
  return (
    <section className="editor-section">
      <div className="section-heading">
        <span><small>02</small><strong>Narrative</strong></span>
        <p>Author equal factual coverage naturally in each language.</p>
      </div>
      <div className="paired-columns">
        <div>
          <LocaleHeading locale="en" />
          {narrative.map(([label, en]) => (
            <Field key={label} label={label} value={en} locale="en" multiline required />
          ))}
        </div>
        <div>
          <LocaleHeading locale="hr" complete={!failure} />
          {narrative.map(([label, , hr], index) => (
            <Field
              key={label}
              label={label}
              value={failure && index === 3 ? "" : hr}
              locale="hr"
              multiline
              required
              issue={failure && index === 3}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StructuredAssets({ failure, locale = "both" }) {
  return (
    <section className="asset-stack">
      <div className="asset-card">
        <div className="asset-card__top">
          <span className="asset-thumb image-thumb"><Icon>▧</Icon></span>
          <span><strong>event-platform-overview.webp</strong><small>1600 × 900 · 184 KB · focal point set</small></span>
          <button type="button">Replace</button>
        </div>
        {(locale === "both" || locale === "en") && <Field label="Alternative text" locale="en" value="Event platform observability dashboard showing consumer lag and retries." required />}
        {(locale === "both" || locale === "hr") && <Field label="Alternative text" locale="hr" value={failure ? "" : "Nadzorna ploča event platforme s consumer lagom i retryjima."} required issue={failure} />}
      </div>
      <div className="asset-card diagram-card">
        <div className="asset-card__top">
          <span className="asset-thumb diagram-thumb"><Icon>⌘</Icon></span>
          <span><strong>Retry and recovery flow</strong><small>Mermaid · sequenceDiagram · build-time SVG</small></span>
          <span className={`build-badge ${failure ? "build-badge--bad" : ""}`}>{failure ? "BUILD FAILED" : "VALID"}</span>
        </div>
        <div className="diagram-editor">
          <pre>{failure ? `${mermaidSource}\n  Worker-->>` : mermaidSource}</pre>
          <div className="diagram-render">
            {failure ? (
              <div className="last-valid">
                <span>LAST VALID RENDER</span>
                <MiniDiagram />
                <small>Draft source failed. Preview keeps the last valid SVG.</small>
              </div>
            ) : <MiniDiagram />}
          </div>
        </div>
        <div className="two-fields">
          <Field label="Caption" locale="en" value="A command is retried safely at the consumer boundary." required />
          <Field label="Caption" locale="hr" value="Command se sigurno retryja na consumer boundaryju." required />
        </div>
      </div>
    </section>
  );
}

function MiniDiagram() {
  return (
    <div className="mini-diagram" aria-label="Rendered architecture diagram">
      <span>API</span><i>→</i><span>QUEUE</span><i>→</i><span>WORKER</span>
      <b>idempotency check</b>
    </div>
  );
}

function VariantA({ state }) {
  const failure = state.scenario === "failure";
  return (
    <div className="studio studio--a">
      <AppHeader state={state} />
      <ProjectHeader />
      <div className="a-layout">
        <main>
          <section className="editor-section">
            <div className="section-heading">
              <span><small>01</small><strong>Project identity</strong></span>
              <p>Shared facts and paired public copy.</p>
            </div>
            <div className="paired-columns">
              <div>
                <LocaleHeading locale="en" />
                <Field label="Title" value={project.title.en} locale="en" required />
                <Field label="One-line summary" value={project.summary.en} locale="en" multiline required />
                <Field label="Role / contribution" value={project.role.en} locale="en" required />
              </div>
              <div>
                <LocaleHeading locale="hr" />
                <Field label="Title" value={project.title.hr} locale="hr" required />
                <Field label="One-line summary" value={project.summary.hr} locale="hr" multiline required />
                <Field label="Role / contribution" value={project.role.hr} locale="hr" required />
              </div>
            </div>
          </section>
          <NarrativePair failure={failure} />
          <section className="editor-section">
            <div className="section-heading">
              <span><small>03</small><strong>Media & diagrams</strong></span>
              <p>Accessible assets; Mermaid is validated and rendered during the build.</p>
            </div>
            <StructuredAssets failure={failure} />
          </section>
        </main>
        <ValidationPanel failure={failure} />
      </div>
      {state.previewOpen && (
        <PreviewModal failure={failure} onClose={() => state.setPreviewOpen(false)} />
      )}
    </div>
  );
}

function PreviewModal({ failure, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div className="preview-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="preview-modal__panel">
        <header>
          <span>
            <small>ON-DEMAND PREVIEW</small>
            <strong id="preview-title">Compare localized public pages</strong>
          </span>
          <button type="button" onClick={onClose} aria-label="Close preview">×</button>
        </header>
        <ReviewScreen failure={failure} />
      </div>
    </div>
  );
}

const steps = [
  ["Core", "Title, role, dates, disclosure"],
  ["Story", "Five narrative sections"],
  ["Evidence", "Skills, links, technologies"],
  ["Media", "Images and Mermaid diagrams"],
  ["Review", "Compare EN + HR previews"],
];

function GuidedSidebar({ state, failure }) {
  return (
    <aside className="guided-sidebar">
      <ProjectHeader compact />
      <nav aria-label="Case study authoring steps">
        {steps.map(([name, description], index) => {
          const done = index < state.step || (!failure && index < 4);
          const issue = failure && (index === 1 || index === 3);
          return (
            <button key={name} type="button" className={state.step === index ? "is-current" : ""} onClick={() => state.setStep(index)}>
              <span className={issue ? "step-number step-number--bad" : done ? "step-number step-number--done" : "step-number"}>
                {issue ? "!" : done ? "✓" : index + 1}
              </span>
              <span><strong>{name}</strong><small>{description}</small></span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-summary">
        <span><StatusDot tone={failure ? "danger" : "ok"} /> {failure ? "3 issues" : "All checks pass"}</span>
        <small>Public version: v6 · safe</small>
      </div>
    </aside>
  );
}

function VariantB({ state }) {
  const failure = state.scenario === "failure";
  const step = steps[state.step];
  return (
    <div className="studio studio--b">
      <AppHeader state={state} />
      <div className="guided-layout">
        <GuidedSidebar state={state} failure={failure} />
        <main className="guided-main">
          <header className="guided-title">
            <span className="eyebrow">STEP {state.step + 1} OF 5</span>
            <h1>{step[0]}</h1>
            <p>{step[1]}. Finish both localized versions before moving on.</p>
          </header>
          <div className="locale-tabs" role="tablist">
            {["en", "hr"].map((locale) => (
              <button key={locale} type="button" role="tab" aria-selected={state.locale === locale} onClick={() => state.setLocale(locale)}>
                <span className={`flag flag--${locale}`}>{locale.toUpperCase()}</span>
                {locale === "en" ? "English" : "Hrvatski"}
                <span className="tab-status">{failure && locale === "hr" ? "2 issues" : "Complete"}</span>
              </button>
            ))}
            <button type="button" className="compare-tab">⇄ Compare languages</button>
          </div>
          {state.step === 0 && (
            <div className="guided-fields">
              <Field label="Title" locale={state.locale} value={project.title[state.locale]} required />
              <Field label="One-line summary" locale={state.locale} value={project.summary[state.locale]} multiline required />
              <Field label="Role / contribution" locale={state.locale} value={project.role[state.locale]} required />
              <div className="two-fields">
                <Field label="Canonical slug" value={project.slug} required hint="Shared across languages" />
                <Field label="Disclosure level" value="Full case study" required hint="Publish-safe content only" />
              </div>
            </div>
          )}
          {state.step === 1 && (
            <div className="guided-fields">
              {narrative.map(([label, en, hr], index) => (
                <Field key={label} label={label} locale={state.locale} value={failure && state.locale === "hr" && index === 3 ? "" : state.locale === "en" ? en : hr} multiline required issue={failure && state.locale === "hr" && index === 3} />
              ))}
            </div>
          )}
          {state.step === 2 && (
            <div className="guided-fields">
              <div className="choice-block">
                <span className="field__label">Technologies & Skill evidence</span>
                <div className="tag-list">{project.tech.map((item) => <span key={item}>{item}<button type="button" aria-label={`Remove ${item}`}>×</button></span>)}</div>
                <button type="button" className="add-button">+ Add evidence</button>
              </div>
              <Field label="Repository URL" value="https://github.com/igrgin/event-platform" hint="Verified · public repository" />
              <Field label="Demo / documentation URL" value="https://docs.example.dev/event-platform" hint="Verified · HTTPS" />
            </div>
          )}
          {state.step === 3 && <StructuredAssets failure={failure} locale={state.locale} />}
          {state.step === 4 && <ReviewScreen failure={failure} />}
          <footer className="guided-footer">
            <button type="button" disabled={state.step === 0} onClick={() => state.setStep(Math.max(0, state.step - 1))}>← Previous</button>
            <span>Changes are draft-only until explicit publication.</span>
            <button className="next-button" type="button" disabled={state.step === 4} onClick={() => state.setStep(Math.min(4, state.step + 1))}>Save & continue →</button>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ReviewScreen({ failure }) {
  return (
    <div className="review-screen">
      <div className="review-toolbar">
        <span><StatusDot tone={failure ? "danger" : "ok"} /> {failure ? "Publication blocked" : "Ready to publish"}</span>
        <div><button type="button">Desktop</button><button type="button">Mobile</button></div>
      </div>
      <div className="preview-pair">
        {["en", "hr"].map((locale) => (
          <article key={locale}>
            <span className={`flag flag--${locale}`}>{locale.toUpperCase()}</span>
            <h2>{project.title[locale]}</h2>
            <p>{project.summary[locale]}</p>
            <MiniDiagram />
            <h3>{locale === "en" ? "Outcome / impact" : "Ishod / utjecaj"}</h3>
            <p>{failure && locale === "hr" ? <mark>Missing required section</mark> : narrative[3][locale === "en" ? 1 : 2]}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

const outline = [
  ["Overview", "✓"],
  ["Narrative", "✓"],
  ["Technologies", "✓"],
  ["Links", "✓"],
  ["Media", "✓"],
  ["Diagrams", "✓"],
  ["Search & sharing", "✓"],
];

function OutlineSidebar({ state, failure }) {
  return (
    <aside className="outline-sidebar">
      <ProjectHeader compact />
      <div className="outline-locales">
        <button type="button" className={state.locale === "en" ? "is-current" : ""} onClick={() => state.setLocale("en")}>EN <span>Complete</span></button>
        <button type="button" className={state.locale === "hr" ? "is-current" : ""} onClick={() => state.setLocale("hr")}>HR <span>{failure ? "2 issues" : "Complete"}</span></button>
      </div>
      <nav aria-label="Document outline">
        {outline.map(([name, status]) => (
          <button key={name} type="button" className={state.section === name ? "is-current" : ""} onClick={() => state.setSection(name)}>
            <span>{name === "Narrative" || name === "Media" ? "▾" : "·"}</span>
            <strong>{name}</strong>
            <em>{failure && ((name === "Narrative" && state.locale === "hr") || name === "Diagrams") ? "!" : status}</em>
          </button>
        ))}
      </nav>
      <button type="button" className="add-section">+ Add optional media</button>
    </aside>
  );
}

function PreviewPane({ state, failure }) {
  const locale = state.locale;
  return (
    <aside className="live-preview">
      <div className="preview-chrome">
        <span><StatusDot tone={failure ? "warning" : "ok"} /> Draft preview</span>
        <div><button type="button">↻</button><button type="button">↗</button></div>
      </div>
      <div className="browser-bar"><span>portfolio.dev/{locale}/projects/{project.slug}</span></div>
      <article className="public-page">
        <span className="eyebrow">BACKEND INFRASTRUCTURE · CASE STUDY</span>
        <h1>{project.title[locale]}</h1>
        <p className="preview-lede">{project.summary[locale]}</p>
        <div className="preview-facts"><span>ROLE<strong>{project.role[locale]}</strong></span><span>STATUS<strong>Published project</strong></span></div>
        <MiniDiagram />
        <h2>{locale === "en" ? "Outcome / impact" : "Ishod / utjecaj"}</h2>
        {failure && locale === "hr" ? <div className="preview-warning">This required section is missing. The public v6 content remains unchanged.</div> : <p>{narrative[3][locale === "en" ? 1 : 2]}</p>}
        <div className="tag-list">{project.tech.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      </article>
    </aside>
  );
}

function VariantC({ state }) {
  const failure = state.scenario === "failure";
  const locale = state.locale;
  return (
    <div className="studio studio--c">
      <AppHeader state={state} />
      <div className="outline-layout">
        <OutlineSidebar state={state} failure={failure} />
        <main className="block-editor">
          <div className="block-editor__heading">
            <span className="eyebrow">{locale.toUpperCase()} · {state.section}</span>
            <h1>{state.section}</h1>
            <p>Edit structured content on the left; inspect its real public composition on the right.</p>
          </div>
          {state.section === "Narrative" ? (
            <div className="block-list">
              {narrative.map(([label, en, hr], index) => (
                <div className={`content-block ${failure && locale === "hr" && index === 3 ? "content-block--issue" : ""}`} key={label}>
                  <div className="drag">⠿</div>
                  <div>
                    <span className="field__label">{label} · {locale.toUpperCase()}</span>
                    <textarea value={failure && locale === "hr" && index === 3 ? "" : locale === "en" ? en : hr} rows="3" readOnly />
                    {failure && locale === "hr" && index === 3 && <small className="error-text">Required localized block is empty.</small>}
                  </div>
                  <button type="button" aria-label={`Options for ${label}`}>•••</button>
                </div>
              ))}
              <button className="insert-block" type="button">+ Insert narrative block</button>
            </div>
          ) : state.section === "Diagrams" || state.section === "Media" ? (
            <StructuredAssets failure={failure} locale={locale} />
          ) : (
            <div className="block-list">
              <div className="content-block">
                <div className="drag">⠿</div>
                <div>
                  <span className="field__label">{state.section} block · {locale.toUpperCase()}</span>
                  <textarea value={`${state.section} content for ${locale.toUpperCase()} is represented here.`} rows="4" readOnly />
                </div>
                <button type="button">•••</button>
              </div>
              <button className="insert-block" type="button">+ Insert structured block</button>
            </div>
          )}
          {failure && (
            <div className="diagnostic-drawer">
              <span><StatusDot tone="danger" /><strong>3 release blockers</strong></span>
              <button type="button">Review diagnostics ↑</button>
            </div>
          )}
        </main>
        <PreviewPane state={state} failure={failure} />
      </div>
    </div>
  );
}

function PrototypeSwitcher({ current, onChange }) {
  const currentIndex = variants.findIndex((item) => item.key === current);
  const cycle = (direction) => onChange(variants[(currentIndex + direction + variants.length) % variants.length].key);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex]);
  return (
    <div className="prototype-switcher" aria-label="Prototype variant switcher">
      <button type="button" onClick={() => cycle(-1)} aria-label="Previous variant">←</button>
      <span><small>PROTOTYPE</small><strong>{current.toUpperCase()} — {variants[currentIndex].name}</strong></span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant">→</button>
    </div>
  );
}

function App() {
  const state = usePrototype();
  const Variant = useMemo(() => state.variant === "b" ? VariantB : state.variant === "c" ? VariantC : VariantA, [state.variant]);
  return (
    <>
      <Variant state={state} />
      {import.meta.env.MODE !== "production" && <PrototypeSwitcher current={state.variant} onChange={state.setVariant} />}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
