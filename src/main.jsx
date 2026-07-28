/**
 * PROTOTYPE — throw away after the visual direction is chosen.
 * Three variants of the public portfolio shell, switchable via ?variant=,
 * exercised on /about and /projects/distributed-event-platform.
 */
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "./styles.css";

const variants = [
  { key: "a", name: "Operational shell" },
  { key: "b", name: "Editorial dossier" },
  { key: "c", name: "Evidence navigator" },
];

const copy = {
  en: {
    language: "EN",
    about: "About Me",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    contact: "Contact",
    resume: "Résumé",
    theme: "Theme",
    font: "Typeface",
    available: "Available for the right engineering problem",
    role: "Software engineer across systems, data, and developer experience.",
    intro:
      "I design and build dependable software where backend systems, distributed data infrastructure, and the tools engineers use every day meet.",
    bio:
      "My work turns complex operational constraints into maintainable products. I care about clear boundaries, observable behavior, and interfaces that help people understand what a system is doing.",
    explore: "Explore selected work",
    getInTouch: "Start a conversation",
    strongestEvidence: "Selected evidence",
    evidence1: "Backend web systems",
    evidence1Text: "Production services shaped around explicit domain boundaries.",
    evidence2: "Distributed data",
    evidence2Text: "Reliable flows designed for failure, recovery, and change.",
    evidence3: "Developer tooling",
    evidence3Text: "Tools that shorten feedback loops without hiding the system.",
    currentFocus: "Current focus",
    currentFocusText:
      "Practical AI-assisted development, resilient platform foundations, and product-minded technical leadership.",
    stack: "Working set",
    projectTitle: "Distributed event platform",
    projectEyebrow: "Selected project · backend infrastructure",
    projectSummary:
      "A reference case study for an event-processing platform that keeps delivery observable and recoverable as workload and team ownership grow.",
    responsibility: "Role",
    responsibilityText: "Technical lead · architecture and delivery",
    outcome: "Outcome",
    outcomeText: "Predictable recovery and clearer operational ownership",
    constraint: "Core constraint",
    constraintText: "At-least-once delivery without invisible duplicate effects",
    architecture: "Architecture",
    decisions: "Technical decisions",
    decision1: "Idempotency belongs at the consumer boundary",
    decision1Text:
      "Every state-changing consumer records a stable operation key before acknowledging work.",
    decision2: "Retries are visible product behavior",
    decision2Text:
      "Retry state, dead-letter transitions, and operator actions share one observable vocabulary.",
    decision3: "Ownership follows the event contract",
    decision3Text:
      "Schema evolution and operational responsibility are explicit at every boundary.",
    tech: "Technologies",
    repository: "View repository",
    more: "Implementation notes",
    moreText:
      "This prototype uses representative, résumé-safe material to test density. Final claims and measurements require editorial review before publishing.",
    navLabel: "Portfolio navigation",
    page: "View",
    status: "Status",
    prototype: "Throwaway prototype",
    portrait: "Ivo Grgin",
    menu: "Menu",
    close: "Close",
  },
  hr: {
    language: "HR",
    about: "O meni",
    experience: "Iskustvo",
    education: "Obrazovanje",
    skills: "Vještine",
    projects: "Projekti",
    contact: "Kontakt",
    resume: "Životopis",
    theme: "Tema",
    font: "Pismo",
    available: "Otvoren za pravi inženjerski problem",
    role: "Software engineer za backend sustave, distribuiranu data infrastrukturu i developer tooling.",
    intro:
      "Dizajniram i gradim pouzdan softver na sjecištu backend sustava, distribuirane data infrastrukture i alata koje inženjeri svakodnevno koriste.",
    bio:
      "Složena operativna ograničenja pretvaram u održive proizvode. Važne su mi jasne granice, dobar observability i sučelja koja ljudima pomažu razumjeti što sustav radi.",
    explore: "Istraži odabrane projekte",
    getInTouch: "Započni razgovor",
    strongestEvidence: "Odabrano iskustvo",
    evidence1: "Backend web-sustavi",
    evidence1Text: "Produkcijski servisi oblikovani oko jasnih domenskih granica.",
    evidence2: "Distribuirani data sustavi",
    evidence2Text: "Pouzdani data flowovi dizajnirani za kvarove, recovery i promjene.",
    evidence3: "Developer tooling",
    evidence3Text: "Tooling koji skraćuje feedback loop bez skrivanja kompleksnosti sustava.",
    currentFocus: "Trenutačni fokus",
    currentFocusText:
      "Praktična primjena AI-ja u razvoju, otporni platformski temelji i product-minded tehničko vodstvo.",
    stack: "Tech stack",
    projectTitle: "Platforma za distribuirane evente",
    projectEyebrow: "Odabrani projekt · backend infrastruktura",
    projectSummary:
      "Reprezentativni case study event-processing platforme koja zadržava dobar observability i pouzdan recovery dok rastu workload i broj timova koji je održavaju.",
    responsibility: "Uloga",
    responsibilityText: "Tech lead · arhitektura i delivery",
    outcome: "Ishod",
    outcomeText: "Predvidiv recovery i jasniji operational ownership",
    constraint: "Glavno ograničenje",
    constraintText: "At-least-once delivery bez skrivenih duplicate efekata",
    architecture: "Arhitektura",
    decisions: "Tehničke odluke",
    decision1: "Idempotency se rješava na consumer boundaryju",
    decision1Text:
      "Svaki consumer koji mijenja state sprema stabilan operation key prije nego što ack-a event.",
    decision2: "Retryji su vidljivo ponašanje sustava",
    decision2Text:
      "Retry state, DLQ prijelazi i operator actions dijele jedan operativni rječnik.",
    decision3: "Ownership prati event contract",
    decision3Text:
      "Evolucija schema i operativni ownership eksplicitni su na svakoj granici.",
    tech: "Tehnologije",
    repository: "Otvori GitHub repo",
    more: "Implementation bilješke",
    moreText:
      "Prototip koristi reprezentativan, publish-safe sadržaj kako bi ispitao gustoću. Finalne tvrdnje i metrike prije objave trebaju editorial review.",
    navLabel: "Navigacija portfolija",
    page: "Stranica",
    status: "Status",
    prototype: "Privremeni prototip",
    portrait: "Ivo Grgin",
    menu: "Izbornik",
    close: "Zatvori",
  },
};

const navItems = ["about", "experience", "education", "skills", "projects", "contact"];
const technologies = ["TypeScript", "Go", "Kafka", "PostgreSQL", "OpenTelemetry", "Kubernetes"];

function usePrototypeState() {
  const parseLocation = () => {
    const params = new URLSearchParams(window.location.search);
    const variant = variants.some((item) => item.key === params.get("variant"))
      ? params.get("variant")
      : "a";
    const view = window.location.pathname.startsWith("/projects/") ? "project" : "about";
    return { variant, view };
  };

  const [location, setLocation] = useState(parseLocation);
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
  );
  const [fontPair, setFontPair] = useState("plex");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => setLocation(parseLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.font = fontPair;
    document.documentElement.lang = language;
  }, [theme, fontPair, language]);

  const navigate = (view, variant = location.variant) => {
    const path = view === "project" ? "/projects/distributed-event-platform" : "/about";
    window.history.pushState({}, "", `${path}?variant=${variant}`);
    setLocation({ view, variant });
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const setVariant = (variant) => {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", variant);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    setLocation((current) => ({ ...current, variant }));
  };

  return {
    ...location,
    language,
    setLanguage,
    theme,
    setTheme,
    fontPair,
    setFontPair,
    menuOpen,
    setMenuOpen,
    navigate,
    setVariant,
  };
}

function ControlGroup({ state, labels, compact = false }) {
  return (
    <div className={`control-group ${compact ? "control-group--compact" : ""}`}>
      <button
        type="button"
        className="text-control"
        onClick={() => state.setLanguage(state.language === "en" ? "hr" : "en")}
        aria-label={state.language === "en" ? "Prikaži na hrvatskom" : "Show in English"}
      >
        {labels.language}
      </button>
      <button
        type="button"
        className="text-control"
        onClick={() => state.setFontPair(state.fontPair === "plex" ? "atkinson" : "plex")}
        aria-label={`${labels.font}: ${state.fontPair === "plex" ? "IBM Plex" : "Atkinson Hyperlegible"}`}
      >
        {state.fontPair === "plex" ? "Plex" : "Atkinson"}
      </button>
      <button
        type="button"
        className="icon-control"
        onClick={() => state.setTheme(state.theme === "dark" ? "light" : "dark")}
        aria-label={`${labels.theme}: ${state.theme === "dark" ? "dark" : "light"}`}
      >
        <span aria-hidden="true">{state.theme === "dark" ? "☾" : "☼"}</span>
      </button>
      <a className="resume-control" href="#prototype-resume">
        {labels.resume} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

function RouteLink({ state, view, children, className = "" }) {
  const active = state.view === view;
  return (
    <a
      href={view === "project" ? "/projects/distributed-event-platform" : "/about"}
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        state.navigate(view);
      }}
    >
      {children}
    </a>
  );
}

function Portrait({ label, small = false, treatment = "operational" }) {
  return (
    <figure
      className={`portrait portrait--${treatment} ${small ? "portrait--small" : ""}`}
      aria-label={label}
    >
      <div className="portrait__mark" aria-hidden="true">
        <span className="portrait__silhouette" />
        <span className="portrait__monogram">IG</span>
        <span className="portrait__accent" />
      </div>
      <figcaption>
        <strong>{label}</strong>
        <span>software engineer</span>
      </figcaption>
    </figure>
  );
}

function CtaRow({ state, labels }) {
  return (
    <div className="cta-row">
      <RouteLink state={state} view="project" className="button button--primary">
        {labels.explore} <span aria-hidden="true">→</span>
      </RouteLink>
      <a className="button button--secondary" href="#contact">
        {labels.getInTouch}
      </a>
      <a className="button button--quiet" href="#prototype-resume">
        {labels.resume} <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}

function EvidenceList({ labels, numbered = false }) {
  const evidence = [
    [labels.evidence1, labels.evidence1Text],
    [labels.evidence2, labels.evidence2Text],
    [labels.evidence3, labels.evidence3Text],
  ];
  return (
    <div className={`evidence-list ${numbered ? "evidence-list--numbered" : ""}`}>
      {evidence.map(([title, text], index) => (
        <article className="evidence-item" key={title}>
          {numbered && <span className="evidence-item__index">0{index + 1}</span>}
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ArchitectureDiagram({ labels, vertical = false }) {
  return (
    <div
      className={`architecture ${vertical ? "architecture--vertical" : ""}`}
      role="img"
      aria-label={`${labels.architecture}: API receives events, publishes to a log, consumers update services, telemetry makes state visible.`}
    >
      <div className="architecture__node">
        <span>01</span>
        <strong>API</strong>
        <small>ingest</small>
      </div>
      <i aria-hidden="true">→</i>
      <div className="architecture__node architecture__node--accent">
        <span>02</span>
        <strong>event log</strong>
        <small>durable</small>
      </div>
      <i aria-hidden="true">→</i>
      <div className="architecture__node">
        <span>03</span>
        <strong>consumers</strong>
        <small>idempotent</small>
      </div>
      <i aria-hidden="true">→</i>
      <div className="architecture__node">
        <span>04</span>
        <strong>telemetry</strong>
        <small>observable</small>
      </div>
    </div>
  );
}

function DecisionList({ labels, compact = false }) {
  const decisions = [
    [labels.decision1, labels.decision1Text],
    [labels.decision2, labels.decision2Text],
    [labels.decision3, labels.decision3Text],
  ];
  return (
    <ol className={`decision-list ${compact ? "decision-list--compact" : ""}`}>
      {decisions.map(([title, text], index) => (
        <li key={title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProjectFacts({ labels, horizontal = false }) {
  return (
    <dl className={`project-facts ${horizontal ? "project-facts--horizontal" : ""}`}>
      <div>
        <dt>{labels.responsibility}</dt>
        <dd>{labels.responsibilityText}</dd>
      </div>
      <div>
        <dt>{labels.outcome}</dt>
        <dd>{labels.outcomeText}</dd>
      </div>
      <div>
        <dt>{labels.constraint}</dt>
        <dd>{labels.constraintText}</dd>
      </div>
    </dl>
  );
}

function TechnologyList({ labels }) {
  return (
    <section className="technology-block">
      <h2>{labels.tech}</h2>
      <ul className="technology-list" aria-label={labels.tech}>
        {technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
    </section>
  );
}

function VariantA({ state, labels }) {
  return (
    <div className="variant-a">
      <header className="a-topbar">
        <RouteLink state={state} view="about" className="wordmark">
          <span aria-hidden="true">[</span> IVO GRGIN <span aria-hidden="true">]</span>
        </RouteLink>
        <div className="a-location">
          <span>{labels.page}</span>
          <strong>{state.view === "about" ? labels.about : labels.projectTitle}</strong>
        </div>
        <button
          type="button"
          className="mobile-menu"
          aria-expanded={state.menuOpen}
          onClick={() => state.setMenuOpen(!state.menuOpen)}
        >
          {state.menuOpen ? labels.close : labels.menu}
        </button>
        <ControlGroup state={state} labels={labels} compact />
      </header>

      <div className="a-workspace">
        <aside className={`a-sidebar ${state.menuOpen ? "is-open" : ""}`}>
          <div className="a-sidebar__label">portfolio://</div>
          <nav aria-label={labels.navLabel}>
            {navItems.map((item, index) => {
              const isRoute = item === "about" || item === "projects";
              const active =
                (item === "about" && state.view === "about") ||
                (item === "projects" && state.view === "project");
              const content = (
                <>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {labels[item]}
                </>
              );
              return isRoute ? (
                <RouteLink
                  key={item}
                  state={state}
                  view={item === "projects" ? "project" : "about"}
                  className={active ? "is-current" : ""}
                >
                  {content}
                </RouteLink>
              ) : (
                <a key={item} href={`#${item}`}>
                  {content}
                </a>
              );
            })}
          </nav>
          <div className="a-sidebar__status">
            <span className="status-dot" />
            <span>{labels.available}</span>
          </div>
        </aside>

        <main id="main-content" className="a-main">
          {state.view === "about" ? (
            <AAbout state={state} labels={labels} />
          ) : (
            <AProject state={state} labels={labels} />
          )}
        </main>
      </div>
    </div>
  );
}

function AAbout({ state, labels }) {
  return (
    <>
      <section className="a-hero">
        <div className="a-hero__copy">
          <div className="eyebrow">
            <span className="status-dot" /> {labels.available}
          </div>
          <h1>{labels.role}</h1>
          <p className="lede">{labels.intro}</p>
          <p>{labels.bio}</p>
          <CtaRow state={state} labels={labels} />
        </div>
        <Portrait label={labels.portrait} treatment="operational" />
      </section>
      <div className="a-content-grid">
        <section className="panel-heading">
          <div>
            <span>01</span>
            <h2>{labels.strongestEvidence}</h2>
          </div>
          <EvidenceList labels={labels} />
        </section>
        <aside className="a-context">
          <section>
            <span className="mini-label">{labels.currentFocus}</span>
            <p>{labels.currentFocusText}</p>
          </section>
          <TechnologyList labels={labels} />
        </aside>
      </div>
    </>
  );
}

function AProject({ labels }) {
  return (
    <>
      <section className="a-project-hero">
        <div>
          <p className="eyebrow">{labels.projectEyebrow}</p>
          <h1>{labels.projectTitle}</h1>
          <p className="lede">{labels.projectSummary}</p>
        </div>
        <a className="button button--primary" href="https://github.com/igrgin">
          {labels.repository} <span aria-hidden="true">↗</span>
        </a>
      </section>
      <ProjectFacts labels={labels} horizontal />
      <section className="a-project-section">
        <div className="section-line">
          <span>01</span>
          <h2>{labels.architecture}</h2>
        </div>
        <ArchitectureDiagram labels={labels} />
      </section>
      <section className="a-project-section">
        <div className="section-line">
          <span>02</span>
          <h2>{labels.decisions}</h2>
        </div>
        <DecisionList labels={labels} />
      </section>
      <details className="notes-disclosure">
        <summary>{labels.more}</summary>
        <p>{labels.moreText}</p>
      </details>
    </>
  );
}

function VariantB({ state, labels }) {
  return (
    <div className="variant-b">
      <header className="b-header">
        <div className="b-brand">
          <RouteLink state={state} view="about">
            Ivo Grgin
          </RouteLink>
          <span>Software engineer</span>
        </div>
        <nav aria-label={labels.navLabel}>
          {navItems.map((item) =>
            item === "about" || item === "projects" ? (
              <RouteLink
                key={item}
                state={state}
                view={item === "projects" ? "project" : "about"}
              >
                {labels[item]}
              </RouteLink>
            ) : (
              <a key={item} href={`#${item}`}>
                {labels[item]}
              </a>
            ),
          )}
        </nav>
        <ControlGroup state={state} labels={labels} compact />
      </header>

      <main id="main-content" className="b-main">
        {state.view === "about" ? (
          <BAbout state={state} labels={labels} />
        ) : (
          <BProject labels={labels} />
        )}
      </main>

      <footer className="b-footer">
        <span>{labels.prototype}</span>
        <span>© Ivo Grgin</span>
      </footer>
    </div>
  );
}

function BAbout({ state, labels }) {
  return (
    <>
      <section className="b-hero">
        <div className="b-hero__index">
          <span>PROFILE / 001</span>
          <Portrait label={labels.portrait} small treatment="editorial" />
        </div>
        <div className="b-hero__story">
          <p className="b-kicker">{labels.available}</p>
          <h1>{labels.role}</h1>
          <p className="b-intro">{labels.intro}</p>
          <p>{labels.bio}</p>
          <CtaRow state={state} labels={labels} />
        </div>
      </section>
      <section className="b-evidence">
        <div className="b-section-title">
          <span>02</span>
          <h2>{labels.strongestEvidence}</h2>
          <p>{labels.currentFocusText}</p>
        </div>
        <EvidenceList labels={labels} numbered />
      </section>
      <section className="b-toolkit">
        <div>
          <span className="mini-label">{labels.currentFocus}</span>
          <p>{labels.currentFocusText}</p>
        </div>
        <TechnologyList labels={labels} />
      </section>
    </>
  );
}

function BProject({ labels }) {
  return (
    <article className="b-project">
      <header className="b-project__header">
        <p className="b-kicker">{labels.projectEyebrow}</p>
        <h1>{labels.projectTitle}</h1>
        <p className="b-intro">{labels.projectSummary}</p>
        <a className="b-text-link" href="https://github.com/igrgin">
          {labels.repository} <span aria-hidden="true">↗</span>
        </a>
      </header>
      <ProjectFacts labels={labels} horizontal />
      <figure className="b-architecture">
        <figcaption>
          <span>01</span>
          {labels.architecture}
        </figcaption>
        <ArchitectureDiagram labels={labels} />
      </figure>
      <section className="b-decisions">
        <header>
          <span>02</span>
          <h2>{labels.decisions}</h2>
        </header>
        <DecisionList labels={labels} />
      </section>
      <div className="b-project__footer">
        <TechnologyList labels={labels} />
        <details className="notes-disclosure">
          <summary>{labels.more}</summary>
          <p>{labels.moreText}</p>
        </details>
      </div>
    </article>
  );
}

function VariantC({ state, labels }) {
  const [selectedEvidence, setSelectedEvidence] = useState(0);
  const evidence = [
    [labels.evidence1, labels.evidence1Text, "SYSTEMS"],
    [labels.evidence2, labels.evidence2Text, "DATA"],
    [labels.evidence3, labels.evidence3Text, "TOOLS"],
  ];
  return (
    <div className="variant-c">
      <header className="c-header">
        <RouteLink state={state} view="about" className="c-logo">
          <span aria-hidden="true">I/G</span>
          <span className="sr-only">Ivo Grgin</span>
        </RouteLink>
        <div className="c-current">
          <span>{state.view === "about" ? "PROFILE" : "CASE STUDY"}</span>
          <strong>{state.view === "about" ? labels.about : labels.projectTitle}</strong>
        </div>
        <ControlGroup state={state} labels={labels} compact />
      </header>
      <div className="c-layout">
        <aside className="c-index">
          <span className="mini-label">INDEX</span>
          <nav aria-label={labels.navLabel}>
            {navItems.map((item, index) =>
              item === "about" || item === "projects" ? (
                <RouteLink
                  key={item}
                  state={state}
                  view={item === "projects" ? "project" : "about"}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{labels[item]}</strong>
                </RouteLink>
              ) : (
                <a key={item} href={`#${item}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{labels[item]}</strong>
                </a>
              ),
            )}
          </nav>
          <div className="c-index__availability">
            <span className="status-dot" />
            {labels.available}
          </div>
        </aside>
        <main id="main-content" className="c-main">
          {state.view === "about" ? (
            <CAbout
              state={state}
              labels={labels}
              evidence={evidence}
              selectedEvidence={selectedEvidence}
              setSelectedEvidence={setSelectedEvidence}
            />
          ) : (
            <CProject labels={labels} />
          )}
        </main>
      </div>
    </div>
  );
}

function CAbout({ state, labels, evidence, selectedEvidence, setSelectedEvidence }) {
  return (
    <>
      <section className="c-hero">
        <div className="c-hero__copy">
          <p className="eyebrow">IVO GRGIN · SOFTWARE ENGINEER</p>
          <h1>{labels.role}</h1>
          <p className="lede">{labels.intro}</p>
          <CtaRow state={state} labels={labels} />
        </div>
        <div className="c-hero__aside">
          <Portrait label={labels.portrait} small treatment="navigator" />
          <p>{labels.bio}</p>
        </div>
      </section>
      <section className="c-explorer">
        <div className="c-explorer__title">
          <span className="mini-label">{labels.strongestEvidence}</span>
          <strong>{String(selectedEvidence + 1).padStart(2, "0")} / 03</strong>
        </div>
        <div className="c-explorer__body">
          <div className="c-explorer__tabs" role="tablist" aria-label={labels.strongestEvidence}>
            {evidence.map(([title, , code], index) => (
              <button
                key={title}
                type="button"
                role="tab"
                aria-selected={selectedEvidence === index}
                onClick={() => setSelectedEvidence(index)}
              >
                <span>{code}</span>
                {title}
              </button>
            ))}
          </div>
          <article className="c-explorer__detail" role="tabpanel">
            <span aria-hidden="true">0{selectedEvidence + 1}</span>
            <div>
              <h2>{evidence[selectedEvidence][0]}</h2>
              <p>{evidence[selectedEvidence][1]}</p>
              <p>{labels.currentFocusText}</p>
              <RouteLink state={state} view="project" className="b-text-link">
                {labels.explore} <span aria-hidden="true">→</span>
              </RouteLink>
            </div>
          </article>
        </div>
      </section>
      <TechnologyList labels={labels} />
    </>
  );
}

function CProject({ labels }) {
  return (
    <div className="c-project">
      <header className="c-project__hero">
        <div>
          <p className="eyebrow">{labels.projectEyebrow}</p>
          <h1>{labels.projectTitle}</h1>
          <p className="lede">{labels.projectSummary}</p>
        </div>
        <a className="button button--primary" href="https://github.com/igrgin">
          {labels.repository} <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className="c-project__workspace">
        <aside>
          <ProjectFacts labels={labels} />
          <TechnologyList labels={labels} />
        </aside>
        <div className="c-project__story">
          <section>
            <div className="section-line">
              <span>01</span>
              <h2>{labels.architecture}</h2>
            </div>
            <ArchitectureDiagram labels={labels} vertical />
          </section>
          <section>
            <div className="section-line">
              <span>02</span>
              <h2>{labels.decisions}</h2>
            </div>
            <DecisionList labels={labels} compact />
          </section>
          <details className="notes-disclosure">
            <summary>{labels.more}</summary>
            <p>{labels.moreText}</p>
          </details>
        </div>
      </div>
    </div>
  );
}

function PrototypeSwitcher({ current, onChange }) {
  const currentIndex = variants.findIndex((item) => item.key === current);
  const cycle = (direction) => {
    const next = (currentIndex + direction + variants.length) % variants.length;
    onChange(variants[next].key);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="prototype-switcher" aria-label="Prototype variant switcher">
      <button type="button" onClick={() => cycle(-1)} aria-label="Previous variant">
        ←
      </button>
      <span>
        <small>PROTOTYPE</small>
        <strong>
          {current.toUpperCase()} — {variants[currentIndex].name}
        </strong>
      </span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}

function App() {
  const state = usePrototypeState();
  const labels = useMemo(() => copy[state.language], [state.language]);

  const Variant =
    state.variant === "b" ? VariantB : state.variant === "c" ? VariantC : VariantA;

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Variant state={state} labels={labels} />
      {import.meta.env.MODE !== "production" && (
        <PrototypeSwitcher current={state.variant} onChange={state.setVariant} />
      )}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
