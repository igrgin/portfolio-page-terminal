# Bilingual TUI Portfolio Implementation Specification

**Status:** Approved by Ivo Grgin on 2026-07-29
**Owner:** Ivo Grgin
**Decision history:** [Specify the bilingual TUI portfolio](https://github.com/igrgin/portfolio-page-terminal/issues/1)
**Normative language:** `MUST`, `MUST NOT`, `SHOULD`, and `MAY` are used as requirement terms.

This file is the authoritative implementation contract. Linked Wayfinder tickets retain
the decision history and rationale; they do not compete with this specification.

## 1. Purpose, scope, and non-goals

- **SCOPE-01 — Product.** The product MUST be a conventional, routed, clickable
  bilingual portfolio whose visual language is inspired by modern operational terminal
  user interfaces. It MUST NOT require commands, typing, or learned terminal syntax.
- **SCOPE-02 — Positioning.** The portfolio MUST present Ivo Grgin as a software
  engineer working across backend web systems, distributed data infrastructure, and
  developer tooling.
- **SCOPE-03 — Locales.** English and Croatian MUST be complete, equal-status
  Localized versions with equal factual coverage.
- **SCOPE-04 — Initial release.** The first release MUST include About Me,
  Experience, Education, Skills, Projects, Contact, Privacy, and globally available
  English and Croatian résumés.
- **SCOPE-05 — Cost.** The initial release MUST use dependable free or
  near-zero-cost service tiers and a free hosting URL. The architecture MUST permit a
  custom domain later without an application rewrite.
- **SCOPE-06 — Planning boundary.** Production implementation, content population,
  provider provisioning, deployment, and launch occur after this specification is
  approved.
- **SCOPE-07 — Non-goals.** The first release MUST NOT include a terminal emulator,
  command interface, bespoke CMS, multi-editor workflow, public unfinished AI Project,
  product analytics, consent banner, repository-authored Project narrative, custom
  interactive diagram, or purchased/custom domain.

## 2. Audience and success criteria

- **SUCCESS-01 — Primary audience.** The primary audience MUST be
  software-engineering hiring managers and technical interviewers. Collaborators and
  clients are secondary.
- **SUCCESS-02 — Immediate comprehension.** Without learning a site convention, a
  visitor MUST be able to identify Ivo's role, strongest evidence, Projects, résumé
  access, and Contact path.
- **SUCCESS-03 — Evidence over decoration.** The interface MUST prioritize
  publish-safe evidence of capability over decorative chrome, invented metrics, or
  unsupported proficiency claims.
- **SUCCESS-04 — Web-native behavior.** Every primary destination MUST have a
  shareable, indexable URL and use normal link behavior, history, pointer, touch, and
  keyboard interaction.
- **SUCCESS-05 — Resilience.** A failed content build, invalid draft, failed diagram,
  or unavailable Contact form MUST NOT degrade the last successful public site.
- **SUCCESS-06 — Release quality.** The site MUST satisfy the accessibility,
  performance, SEO, privacy, security, browser, hosting, and editorial gates in this
  specification before release approval.

## 3. Information architecture and navigation

- **IA-01 — English routes.** The English route set MUST be `/en/about`,
  `/en/experience`, `/en/education`, `/en/skills`, `/en/projects`,
  `/en/contact`, and `/en/privacy`.
- **IA-02 — Croatian routes.** The Croatian route set MUST be `/hr/o-meni`,
  `/hr/iskustvo`, `/hr/obrazovanje`, `/hr/vjestine`, `/hr/projekti`,
  `/hr/kontakt`, and `/hr/privatnost`.
- **IA-03 — Root routing.** `/` MUST redirect to an explicitly saved locale when one
  exists and to English otherwise. Browser language alone MUST NOT be persisted as a
  choice.
- **IA-04 — Projects.** Each published Project MUST have an index entry and a detail
  URL under `/en/projects/{canonical-slug}` and
  `/hr/projekti/{canonical-slug}`. The paired Localized versions MUST share the
  canonical slug.
- **IA-05 — Locale pairing.** Every localized route MUST expose its paired route to
  the language control, metadata, and `hreflang` links. A locale switch MUST preserve
  the current content entity when a paired version exists.
- **IA-06 — Global navigation.** The six primary destinations—About Me, Experience,
  Education, Skills, Projects, and Contact—MUST remain globally reachable. Privacy
  MUST be linked from the global footer.
- **IA-07 — Global actions.** Language, theme, and both résumé downloads MUST remain
  globally reachable. Résumé links MUST identify their language and PDF format.
- **IA-08 — Missing content.** Unpublished or invalid content MUST NOT produce an
  index entry, sitemap entry, broken locale switch, or public placeholder. Unknown
  routes MUST return a localized not-found experience with working global navigation.

## 4. Visual system and responsive behavior

- **UX-01 — Approved direction.** Production MUST reproduce the approved
  **Variant A — Operational shell** from the
  [final reviewed prototype](https://github.com/igrgin/portfolio-page-terminal/commit/3739129).
  Prototype switching and the rejected Variant B/C directions MUST NOT ship.
- **UX-02 — Shell.** Wide layouts MUST use compact global chrome, a permanent narrow
  icon-led navigation rail approximately 220 CSS pixels wide, and a content-first
  primary pane. A contextual rail MAY appear only when it carries useful facts or a
  Project table of contents.
- **UX-03 — Small screens.** Small-screen and high-zoom layouts MUST use a
  permanently visible, compact two-column primary navigation grid rather than a
  hamburger or hidden drawer. Content MUST become a single readable column.
- **UX-04 — Density.** The design MUST use compact chrome and comfortable content.
  It MUST avoid oversized titles, decorative dead space, nested-card maximalism, and
  unnecessary full-viewport heroes. Relevant work or evidence SHOULD appear in the
  first desktop viewport.
- **UX-05 — Typography.** Production MUST use locally hosted IBM Plex Sans for
  narrative text and IBM Plex Mono for shell chrome, labels, dates, tags, and short
  headings. Long-form copy MUST NOT use monospace. The prototype typeface comparison
  control and unused Atkinson assets MUST NOT ship.
- **UX-06 — Type behavior.** Body text MUST be at least `1rem`, use approximately
  `1.55` line height, and keep long-form measure near `60–72ch`. Fixed-height text
  containers and clipped labels MUST NOT prevent text-spacing overrides or zoom.
- **UX-07 — Themes.** Light and dark themes MUST use the same semantic token contract:
  canvas, surface, raised surface, primary/muted text, normal/strong border, focus,
  accent/subtle accent, link, success, warning, danger, and selection. The themes
  MUST be designed independently rather than mechanically inverted.
- **UX-08 — Theme preference.** First visit MUST honor the system theme without
  persisting it. Only an explicit visitor choice MAY be stored locally. The theme
  control MUST be operable and labelled in both locales.
- **UX-09 — State.** Focus, hover, current navigation, selection, success, warning,
  and error MUST be distinguishable by more than color. Focus MUST use a visible,
  high-contrast outline or border treatment.
- **UX-10 — TUI restraint.** The site MUST NOT contain fake terminal window controls,
  shell prompts, blinking carets, boot text, simulated transcripts, CRT scanlines,
  glow-heavy copy, flicker, Matrix effects, or invented system status.
- **UX-11 — ASCII.** ASCII MAY be used only as a short decorative signature. It MUST
  be responsive, `aria-hidden` when decorative, and duplicated by equivalent real
  text. It MUST NOT encode navigation or essential information.
- **UX-12 — Motion.** Motion MUST clarify state changes, normally within
  `100–180ms`. Essential copy MUST NOT use typing effects; normal reading MUST NOT
  contain looping animation; nonessential motion MUST be disabled under
  `prefers-reduced-motion`.
- **UX-13 — Progressive disclosure.** Essential biography, titles, dates, outcomes,
  and calls to action MUST remain visible. Secondary implementation notes, galleries,
  and long technology lists MAY use a semantic disclosure.
- **UX-14 — Portrait.** About Me MUST use the approved offset architectural portrait
  treatment with appropriate responsive cropping. Mobile reading order MUST place the
  introduction before the portrait.

## 5. Content model and bilingual rules

- **CONTENT-01 — CMS authority.** Sanity MUST be the authoritative content source.
  Only publish-safe material, including drafts, MAY enter its public Free-plan
  dataset.
- **CONTENT-02 — Paired localization.** Required English and Croatian values MUST be
  sibling fields in one document and publish together. Optional localized values
  MUST be present in both locales or absent in both. Natural Croatian usage takes
  precedence over literal translation.
- **CONTENT-03 — Singletons.** The model MUST provide Site settings, About Me,
  Contact, Privacy notice, Profile media, and Résumé set singletons.
- **CONTENT-04 — Repeatable documents.** The model MUST provide Experience,
  Education, Skill, and Project documents.
- **CONTENT-05 — Shared identity.** Site settings MUST own the professional display
  name, localized default search/share metadata, default sharing image, ordered
  Contact-channel list, and Résumé-set reference.
- **CONTENT-06 — About Me.** About Me MUST own localized headline, biography, current
  focus, ordered selected-Skill and featured-Project references, and Profile-media
  reference. It MUST present concise positioning, strengths, selected evidence, and
  featured work.
- **CONTENT-07 — Contact channels.** The shared ordered channel list MUST be rendered
  by About Me, Contact, and compact global surfaces. About Me MAY use labelled
  icon-only actions; Contact MUST use icons plus visible action text.
- **CONTENT-08 — Experience.** Each Experience MUST support public employer or
  confidential-client label, localized official role, month/year range with current
  state, optional location/employment type/employer URL, localized summary and
  achievement bullets, and Skill references. Disclosure MUST stay at résumé-level
  detail.
- **CONTENT-09 — Education.** Each Education MUST support institution,
  degree/qualification, field, year range with in-progress state, optional location
  and URL, ordered Relevant subjects, and Skill references. Grades, transcripts,
  diploma scans, and student identifiers MUST NOT publish by default.
- **CONTENT-10 — Skill.** Each Skill MUST have a canonical name, optional localized
  display name, controlled category, localized capability statement, optional curated
  icon and documentation link, ordering settings, and optional scoped evidence note.
- **CONTENT-11 — Skill categories.** Categories MUST be Backend engineering,
  Distributed data systems, Developer tooling, AI and machine learning, Frontend
  engineering, and Platforms and operations.
- **CONTENT-12 — Skill evidence.** A published Skill MUST be supported by a published
  Experience, Education, or Project reference, or by one precise publish-safe scoped
  evidence note. Percentages, stars, levels, endorsements, and automatically
  increasing years-of-experience claims MUST NOT appear.
- **CONTENT-13 — Project disclosure.** A Project MUST be either summary-only or a
  full case study. Both levels require localized title, summary, explicit
  role/contribution, dates/status, Skill references, and optional links/media. A full
  case study additionally requires localized context/problem, constraints, approach,
  outcome/impact, and lessons/reflections.
- **CONTENT-14 — Project metadata.** Projects MUST support canonical slug,
  featured/manual order, repository/demo/documentation links, hero/media assets with
  localized alternative text, and diagram assets. Localized title and summary MUST
  derive search/share metadata unless an approved override is present.
- **CONTENT-15 — Sensitive work.** Unapproved client identities, internal names,
  confidential metrics/architecture, and unfinished or sensitive AI Projects MUST
  remain outside public content. Accurately scoped PyTorch and OpenAI model/API
  experience MAY appear as Skill evidence.
- **CONTENT-16 — Profile media.** Profile media MUST contain one primary portrait,
  crop/focal-point data, localized alternative text, optional localized
  caption/credit, and an optional sharing image.
- **CONTENT-17 — Résumé set.** The Résumé set MUST contain paired English and
  Croatian PDFs, per-file update dates, stable filenames, optional internal version
  note, and the approved broad-overview disclaimer: “This résumé provides a broad
  overview of my experience and is not tailored to a specific role.” /
  “Ovaj životopis pruža širi pregled mojeg iskustva i nije prilagođen pojedinoj
  poziciji.” The PDFs MUST have selectable text and pass metadata, privacy, type, and
  size validation. Editable sources MUST remain outside Sanity.
- **CONTENT-18 — Contact and privacy copy.** Contact MUST own localized introduction
  and optional availability/timezone copy. Privacy MUST own effective date,
  privacy-request contact, processors/transfers, retention, rights/request procedure,
  and AZOP complaint information.
- **CONTENT-19 — Ordering.** Experience and Education MUST sort reverse
  chronologically with current/in-progress first. Projects, Skills, Relevant subjects,
  Contact channels, About Me selections, and featured Projects MUST use explicit
  editorial ordering.
- **CONTENT-20 — References.** Strong references MUST resolve to published,
  publish-safe content. A Publication batch MUST include every changed document in
  the strong-reference closure.
- **CONTENT-21 — Repository narratives.** The first release MUST keep Project
  narratives and media in Sanity. The model MAY reserve a disabled per-locale source
  hook, but MUST NOT fetch repository content in production or expose it editorially
  until a separately approved enhancement implements pinned, reviewed, sanitized
  snapshots.

## 6. Editorial, preview, publication, and rollback workflow

- **EDITORIAL-01 — Authoring surface.** Sanity-hosted Studio MUST be the private,
  authenticated, single-owner authoring surface. It MUST deploy independently from
  the public application.
- **EDITORIAL-02 — Project authoring.** Full Project case studies MUST use the
  approved paired EN/HR canvas with structured sections, shared canonical facts, and a
  persistent live public-page preview.
- **EDITORIAL-03 — Project preview.** The Project preview MUST provide EN/HR
  controls, synchronize with editing context, show real public composition and
  responsive behavior, remain available in stacked layouts, and expose light/dark
  authoring themes with a persisted explicit choice.
- **EDITORIAL-04 — Readiness.** A visible readiness summary MUST block publication
  for missing paired content, invalid shared data, unresolved references, unsafe
  assets/URLs, missing accessibility text, or invalid Mermaid. An invalid Mermaid
  draft MUST preserve the last valid rendered diagram in preview and the current
  production Project while clearly reporting that the draft is invalid.
- **EDITORIAL-05 — Publication batch.** A Publication batch MUST be a named,
  dependency-complete group of changed drafts. Editing after validation MUST
  invalidate validation, EN/HR preview acknowledgements, and its rollback bundle.
- **EDITORIAL-06 — Batch validation.** Validation MUST cover bilingual factual
  parity, localized accessibility copy, strong-reference closure, dates, URLs,
  ordering, slugs, image/PDF/diagram rules, publish safety, privacy boundaries, and
  active free-tier release limits.
- **EDITORIAL-07 — Draft preview.** The complete batch MUST be reviewed through
  authenticated, non-indexable application Draft Mode using server-only credentials.
  The real composition, links, media, résumés, diagrams, SEO, sharing metadata, and
  responsive behavior MUST be reviewed separately in English and Croatian. Preview
  MUST use Sanity/application capabilities and MUST NOT depend on paid Vercel Content
  Link.
- **EDITORIAL-08 — Preview approval.** The workflow MUST record separate EN and HR
  acknowledgements. Any subsequent edit MUST clear both.
- **EDITORIAL-09 — Rollback bundle.** Before publication, the workflow MUST capture
  current published document versions and asset references for the complete batch.
  The private bundle MUST be access-controlled.
- **EDITORIAL-10 — Publication.** The complete batch MUST publish in one Sanity
  transaction and trigger exactly one protected production build. “Published in
  Sanity” and “live on the portfolio” MUST remain distinct states.
- **EDITORIAL-11 — Build failure.** Production MUST switch only after a successful
  build and release checks. A failed candidate MUST leave the previous deployment
  live and restore affected Sanity documents transactionally before a confirming
  build.
- **EDITORIAL-12 — Post-release rollback.** A post-release defect MUST first
  reactivate the previous successful application deployment, then restore Sanity from
  the batch bundle and confirm alignment with a new build.
- **EDITORIAL-13 — Export.** Automated off-platform Sanity exports MUST include
  documents, drafts, and assets. A restore into a non-production project MUST be
  exercised before launch and periodically thereafter.

## 7. Technical architecture and integrations

- **TECH-01 — Workspace.** Use one lightweight workspace repository containing a
  TypeScript Next.js App Router application, Sanity Studio source, shared content
  contracts, and generated types. Web and Studio MUST deploy independently.
- **TECH-02 — Rendering.** Every published EN/HR main and Project route MUST be
  pre-rendered. Public pages MUST NOT fetch Sanity in the browser or require Sanity at
  request time.
- **TECH-03 — Components.** Use shadcn/ui as an owned source-code scaffold with Base
  UI explicitly pinned as the primitive foundation. Generated components and Base UI
  MUST sit behind portfolio-owned wrappers and semantic TUI tokens.
- **TECH-04 — Semantic HTML.** Use semantic HTML when no interactive primitive is
  required. React Aria Components MAY be introduced only for a documented
  accessibility or cross-input gap. Primitive systems MUST NOT be mixed casually.
- **TECH-05 — Content access.** Production builds MUST read published Sanity
  documents. Authenticated Draft Mode MAY read drafts using credentials that never
  reach the browser.
- **TECH-06 — Runtime boundary.** Runtime behavior MUST be limited to authenticated
  preview and the conditionally approved same-origin Contact endpoint. Provider
  integrations MUST sit behind thin local boundaries; speculative multi-provider
  abstraction MUST NOT be built.
- **TECH-07 — Contact availability.** Contact MUST always show email, LinkedIn,
  GitHub, and lower-prominence phone links. The form MUST render only when every
  delivery, processor, transfer, retention, security, and privacy gate passes.
- **TECH-08 — Contact fields.** The form MUST contain optional name (trimmed, at most
  100 Unicode characters), required reply email (trimmed, syntactically valid, at
  most 254 characters), and required message (trimmed, 10–5,000 Unicode characters).
  It MUST NOT add subject, company, phone, attachment, consent, or marketing fields.
- **TECH-09 — Contact validation.** Browser validation MUST provide immediate
  localized feedback; the server MUST enforce the same bounds authoritatively.
  Invalid submission MUST preserve valid entries and focus the first invalid field.
  Drafts MUST NOT persist in browser storage.
- **TECH-10 — Contact delivery.** Use a same-origin Cloudflare/OpenNext Route Handler
  to relay plain-text mail through tightly scoped Amazon SES in an EEA region to one
  fixed verified mailbox. Use fixed sender, recipient, and subject; visitor email is
  `Reply-To`. Create no form database, payload log, or acknowledgement email.
- **TECH-11 — Abuse controls.** Use a non-focusable honeypot, bounded request/field
  sizes, at most five attempts per privacy-preserving IP token per 60 seconds, a
  documented conservative route-wide ceiling, and the SES sandbox cap. A filled
  honeypot MUST return apparent success without sending. CAPTCHA MUST NOT ship.
- **TECH-12 — Contact states.** Submission MUST expose localized sending status and
  disable duplicate submission. SES acceptance MUST clear fields and report
  “accepted for delivery,” not delivery. Rate limits MUST preserve entries and state
  when to retry. Ambiguous provider failure MUST preserve current-page text, report
  that delivery could not be confirmed, offer copy-message, and show direct channels.
  It MUST NOT retry automatically.
- **TECH-13 — Mermaid contract.** Mermaid MUST be the only diagram language.
  Accept only `sequenceDiagram` and constrained `flowchart`; reject directives,
  frontmatter, clicks, links, HTML labels, remote assets, includes, and unapproved
  grammars. Limit source to 50 KiB and each theme render to 10 seconds initially.
- **TECH-14 — Diagram assets.** An exact-pinned Mermaid CLI MUST render EN-light,
  EN-dark, HR-light, and HR-dark SVGs before the application build using
  renderer-owned strict configuration and no network resources. SVG output MUST be
  parsed and reject scripts, `foreignObject`, event handlers, links, external/data
  URLs, and CSS imports.
- **TECH-15 — Diagram accessibility.** Every diagram MUST have localized title,
  caption, and prose long description. Production MUST use an external SVG image in
  an HTML `figure` with an HTML-level description; it MUST NOT inject raw SVG.
  Narrow layouts MUST preserve readable text through bounded scroll or enlargement.
- **TECH-16 — Dependency control.** Direct dependencies and the lockfile MUST be
  committed. Base UI, OpenNext, Mermaid CLI, and other build/runtime foundations MUST
  use exact or deliberately bounded versions and pass upgrade fixtures before change.
- **TECH-17 — Analytics prohibition.** The first release MUST contain no product
  analytics SDK, beacon, event model, tracking identifier, consent banner, analytics
  abstraction, or dormant hook. Operational logs MUST NOT be repurposed for audience
  measurement.

## 8. Accessibility, performance, SEO, privacy, and security

### Accessibility

- **A11Y-01 — Standard.** Public and Studio workflows in scope for the owner MUST
  meet WCAG 2.2 AA.
- **A11Y-02 — Semantics.** Primary navigation MUST use links, actions MUST use
  labelled controls, headings and landmarks MUST form a coherent hierarchy, and
  controls MUST expose accessible names, roles, values, errors, and state.
- **A11Y-03 — Input.** Essential interactions MUST work by keyboard, pointer, and
  touch. Important navigation/global controls SHOULD use approximately `40–44` CSS
  pixel touch rows and MUST meet WCAG target-size/spacing rules.
- **A11Y-04 — Reflow.** The page MUST have no global horizontal scroll at 320 CSS
  pixels or 200% zoom. Only meaningful two-dimensional code, table, or diagram
  regions MAY scroll within a labelled boundary.
- **A11Y-05 — Visual access.** Body text and small labels MUST meet `4.5:1`
  contrast; large text, UI boundaries, status, and focus MUST meet their applicable
  WCAG contrast criteria. Color MUST NOT be the sole state cue.
- **A11Y-06 — Content alternatives.** Meaningful images MUST have localized
  alternatives; decorative visuals MUST be hidden from assistive technology.
  Résumé PDFs MUST retain selectable text and diagrams MUST retain HTML-level prose
  alternatives.
- **A11Y-07 — Verification.** Automated scans MUST report no serious or critical
  findings. Manual verification MUST cover keyboard-only use, 200% zoom, text-spacing
  overrides, reduced motion, VoiceOver/Safari, and NVDA/Firefox.

### Performance

- **PERF-01 — Static-first.** Public route delivery MUST be static and cacheable;
  diagram rendering and CMS access MUST stay out of the visitor runtime.
- **PERF-02 — Lighthouse.** Representative production-mode English and Croatian
  routes MUST score at least Performance 90, Accessibility 100, Best Practices 95,
  and SEO 95 in Lighthouse CI's mobile profile.
- **PERF-03 — Web Vitals.** When field data is available, the 75th percentile MUST
  meet LCP `≤2.5s`, INP `≤200ms`, and CLS `≤0.1`. Pre-launch testing MUST use
  repeatable production-like lab measurements and investigate regressions.
- **PERF-04 — Assets.** Fonts, images, PDFs, and generated diagrams MUST be locally
  served, appropriately sized, cacheable, and free of unrequested third-party
  requests.
- **PERF-05 — Browser support.** Fully support the latest two stable major versions
  of Chrome, Edge, Firefox, and Safari, plus current Safari on iOS and Chrome on
  Android. Older browsers SHOULD retain readable content and working links. Internet
  Explorer and obsolete embedded webviews are out of scope.

### SEO and sharing

- **SEO-01 — Metadata.** Every public Localized version MUST provide localized title,
  description, canonical URL, Open Graph/Twitter metadata, and an appropriate sharing
  image.
- **SEO-02 — Localization.** Every paired page MUST publish correct `hreflang`
  alternates for `en` and `hr`, plus a deliberate `x-default` to English.
- **SEO-03 — Discovery.** Production MUST publish a sitemap containing only valid
  public localized routes and a robots policy that permits public pages while
  excluding previews and Studio.
- **SEO-04 — Structured data.** About Me SHOULD provide accurate Person/ProfilePage
  structured data and Projects SHOULD provide accurate CreativeWork/SoftwareSourceCode
  structured data only where the content supports it. Structured data MUST NOT invent
  facts.

### Privacy

- **PRIV-01 — Minimization.** The site MUST contain no advertising, profiling,
  marketing pixels, social widgets, remote fonts/media embeds, or browser-to-GitHub
  content requests. Local storage MAY contain only an explicitly selected locale and
  theme.
- **PRIV-02 — Notice.** Equivalent English and Croatian privacy notices MUST describe
  the actual deployed configuration: controller/contact, purposes/bases, recipients,
  transfers, retention, rights, AZOP complaint path, required form data, local
  preferences, and absence of automated decisions/profiling.
- **PRIV-03 — Just-in-time notice.** Contact submission MUST explain that details are
  used only to receive and answer the enquiry, identify required fields, warn against
  confidential/special-category/unnecessary data, and link the localized notice.
- **PRIV-04 — Retention.** Hosting/security logs SHOULD use the shortest supported
  period and target at most 30 days. Contact relay/queue copies MUST target deletion
  on delivery and within 7 days. Mailbox copies MUST target deletion six months after
  the last meaningful exchange unless moved to a separately justified record.
  Abuse-control data MUST be memory-only or use the shortest TTL, at most 24 hours.
- **PRIV-05 — Accountability.** Before launch, maintain a data inventory,
  legitimate-interests assessments for Contact, security logs, and abuse prevention,
  a deletion routine, rights procedure, processor record, and incident checklist.
  When a person contacts Ivo directly without first seeing the site, the first
  substantive reply MUST link to the applicable privacy notice.
- **PRIV-06 — Providers.** Hosting, CMS, email, and any processor MUST have a current
  Article 28 DPA, reviewed subprocessors/locations/retention/security, and documented
  EEA or lawful transfer path. Unrelated reuse, advertising, cross-customer tracking,
  and model training MUST be prohibited or opted out.
- **PRIV-07 — Analytics change.** Any future analytics proposal requires a new
  product/privacy decision proving no user/device tracking, no browser-side
  third-party request, early IP minimization, aggregate-only output, short raw-detail
  retention, acceptable provider/transfer terms, and a Croatian Article 43
  no-consent conclusion. This specification grants no advance approval.
- **PRIV-08 — Re-review triggers.** Provider changes or addition of CAPTCHA,
  analytics, third-party embeds, newsletter, accounts, payments, uploads,
  advertising, experiments, replay, precise location, AI message analysis, or
  automated decisions MUST trigger a fresh privacy review.

### Security

- **SEC-01 — Accounts and secrets.** Hosting, CMS, source control, DNS/domain, email,
  and delivery accounts MUST use MFA where available and least privilege. Production
  secrets MUST remain outside source and client bundles.
- **SEC-02 — Transport and browser boundary.** Production MUST enforce HTTPS, a
  restrictive content security policy, safe output encoding, and secure preview
  cookies/tokens.
- **SEC-03 — Logging.** Logs MUST NOT contain Contact payloads, email addresses,
  secrets, tokens, or CMS draft content.
- **SEC-04 — Preview.** Preview MUST validate a time-limited secret/token before
  enabling Draft Mode, keep credentials server-only, use non-indexable URLs, and
  provide a reliable exit/expiry path.
- **SEC-05 — Dependencies.** CI MUST run dependency, secret, and build checks.
  Critical exploitable findings MUST block release; supported dependencies MUST be
  patched through reviewed lockfile changes.
- **SEC-06 — Incident readiness.** A working owner/contact path, provider contacts,
  recovery procedure, and personal-data incident assessment checklist MUST exist
  before launch.

## 9. Deployment and operational constraints

- **OPS-01 — Primary deployment.** Deploy the public application through Cloudflare
  OpenNext to Cloudflare Workers Free using a free `workers.dev` URL.
- **OPS-02 — Static inventory.** A dry-run deployment MUST remain at or below the
  active free-tier compressed Worker and static-file limits; under the limits reviewed
  by the map, that means `≤3 MB` compressed Worker and `≤20,000` static files. Current
  provider limits MUST be reverified before release.
- **OPS-03 — Dynamic CPU.** Draft preview and the Contact handler MUST be tested in
  the workerd-based environment and MUST remain within the active free-tier dynamic
  CPU allowance; the reviewed limit is `10ms` CPU per invocation.
- **OPS-04 — Static route proof.** Every public main and Project route MUST appear in
  generated static output and serve without invoking dynamic application code.
- **OPS-05 — Build trigger.** A protected Sanity publication hook MUST trigger one
  atomic build. Failed builds MUST leave the previous production deployment live.
- **OPS-06 — Preview deployment.** A non-production Git branch MUST produce a stable,
  non-promoted preview URL.
- **OPS-07 — Hosting fallback.** If Worker size or workerd/runtime checks fail, deploy
  unchanged application code to Netlify Free. If normal operation consumes at least
  70% of its monthly credits for two consecutive months, move at the next release to
  Cloudflare Workers Paid with limits and alerts.
- **OPS-08 — Portability.** Cloudflare-specific preview/contact integration MUST
  remain behind thin boundaries. Public rendering and content code MUST remain
  portable; no speculative multi-host abstraction is required.
- **OPS-09 — Observability.** Operational logs MAY be used only for security,
  reliability, and diagnosis. Configure minimal retention, redact sensitive data, and
  do not derive visitor metrics.
- **OPS-10 — Operational checks.** Before launch and after provider changes, verify
  content publication, preview authentication, diagram generation, Contact delivery
  and failure behavior, deletion, rollback, export, and restore.

## 10. Acceptance checklist and approval boundary

### Approval boundary

- **APPROVAL-01 — Specification gate.** Implementation MUST NOT begin until Ivo
  Grgin approves this complete `SPEC.md`.
- **APPROVAL-02 — Agent autonomy.** An implementation agent MAY choose reversible
  internal details only when they do not change observable behavior, named
  technologies, ownership boundaries, privacy, bilingual parity, accessibility,
  performance, deployment constraints, or acceptance criteria.
- **APPROVAL-03 — Change control.** A contradiction, omission, provider substitution,
  or proposed change to a protected boundary MUST pause implementation and receive
  explicit approval through a versioned `SPEC.md` update.
- **APPROVAL-04 — Evidence.** The implementation agent MAY complete checks and attach
  evidence but MUST NOT self-approve exceptions or launch.
- **APPROVAL-05 — Release gate.** Only Ivo Grgin may approve unresolved exceptions
  and authorize the first production deployment.

Every check below is binary. Evidence MUST be linked from the implementation pull
request or release record. Failed or unavailable evidence means the check has not
passed.

- [ ] **AC-01 — Scope review** (`SCOPE-01`–`SCOPE-07`, `SUCCESS-01`–`SUCCESS-06`):
  product review confirms every required view, locale, audience goal, non-goal,
  resilience rule, and cost boundary; evidence is a signed scope matrix.
- [ ] **AC-02 — Route crawl** (`IA-01`–`IA-08`): an automated crawl records `200`
  responses for every published route, correct root redirect, paired locale links,
  Project mapping, working global actions, localized not-found behavior, and absence
  of draft/invalid routes from navigation and discovery.
- [ ] **AC-03 — Approved-shell comparison** (`UX-01`–`UX-04`, `UX-14`): desktop and
  mobile screenshots are compared with the approved Variant A capture and confirm the
  permanent navigation compositions, density, portrait order, and removal of
  prototype-only variants and controls.
- [ ] **AC-04 — Typography and themes** (`UX-05`–`UX-09`): computed-style,
  asset/network, light/dark screenshot, system-default, explicit-persistence, focus,
  and color-independence evidence confirms the complete contract.
- [ ] **AC-05 — TUI restraint and behavior** (`UX-10`–`UX-13`): manual review,
  reduced-motion recording, and disclosure keyboard tests confirm the prohibited
  effects are absent and essential content remains visible.
- [ ] **AC-06 — Schema inventory** (`CONTENT-01`–`CONTENT-05`): exported Sanity
  schemas and generated types show the required authority, localization, singleton,
  repeatable, and shared-identity contracts.
- [ ] **AC-07 — Page-content fixtures** (`CONTENT-06`–`CONTENT-09`): EN/HR preview
  fixtures verify About Me, shared channels, résumé-safe Experience, and Education
  fields, sorting, validation, and disclosure boundaries.
- [ ] **AC-08 — Skill fixtures** (`CONTENT-10`–`CONTENT-12`): valid and invalid
  fixtures prove the category allowlist, evidence rule, icon fallback, and prohibition
  of unsupported ratings.
- [ ] **AC-09 — Project fixtures** (`CONTENT-13`–`CONTENT-15`, `CONTENT-21`):
  summary/full, sensitive-work, metadata, invalid-reference, and disabled repository
  source fixtures prove the Project contract.
- [ ] **AC-10 — Media, résumé, privacy, and ordering fixtures**
  (`CONTENT-16`–`CONTENT-20`): validation output and both localized previews prove
  asset accessibility/privacy, paired PDFs, Contact/Privacy fields, ordering, and
  strong-reference closure.
- [ ] **AC-11 — Project authoring review** (`EDITORIAL-01`–`EDITORIAL-04`):
  responsive light/dark Studio recordings show the paired canvas, persistent real-page
  preview, theme behavior, readiness summary, and publication blocking.
- [ ] **AC-12 — Publication-batch scenarios** (`EDITORIAL-05`–`EDITORIAL-12`):
  recorded successful release, failed-build recovery, post-release rollback, edit
  invalidation, bilingual acknowledgement, and transactional restore scenarios prove
  every batch state transition.
- [ ] **AC-13 — Export restore** (`EDITORIAL-13`): dated export logs and a successful
  restore into a non-production Sanity project prove documents, drafts, and assets are
  recoverable.
- [ ] **AC-14 — Build and architecture review** (`TECH-01`–`TECH-06`,
  `TECH-16`): repository tree, build output, client network trace, dependency/lockfile
  audit, preview credential test, and provider-boundary review prove the selected
  architecture.
- [ ] **AC-15 — Direct Contact fallback** (`TECH-07`): Contact screenshots in both
  locales with the form enabled and omitted prove that all four direct channels remain
  complete and operable.
- [ ] **AC-16 — Contact validation** (`TECH-08`, `TECH-09`): browser and direct API
  boundary tests cover whitespace, Unicode, malformed email, every length boundary,
  field association, focus, entry preservation, and absence of draft storage.
- [ ] **AC-17 — Contact delivery and abuse** (`TECH-10`–`TECH-12`): SES sandbox
  evidence, sanitized logs, honeypot/rate-limit tests, duplicate-submit test, accepted
  state, timeout/ambiguous-failure state, copy-message action, and no-retry proof pass
  in both locales.
- [ ] **AC-18 — Diagram pipeline** (`TECH-13`–`TECH-15`): valid flow/sequence,
  EN/HR, light/dark, diacritic, oversized, timeout, malicious-source, forbidden-SVG,
  accessibility, narrow-layout, and deterministic-upgrade fixtures all pass.
- [ ] **AC-19 — Analytics absence** (`TECH-17`, `PRIV-01`, `PRIV-07`,
  `OPS-09`): source/bundle search, browser storage inspection, network trace, and log
  usage review prove there is no product analytics or dormant tracking path.
- [ ] **AC-20 — Automated accessibility** (`A11Y-01`–`A11Y-06`): axe and Lighthouse
  reports for representative routes, locales, and themes contain no serious/critical
  issue, reach Accessibility 100, and confirm contrast, names, semantics, targets,
  alternatives, and reflow.
- [ ] **AC-21 — Manual accessibility** (`A11Y-07`): signed keyboard, 200% zoom,
  320-pixel reflow, text-spacing, reduced-motion, VoiceOver/Safari, and NVDA/Firefox
  scripts pass.
- [ ] **AC-22 — Performance and browser matrix** (`PERF-01`–`PERF-05`):
  production-mode Lighthouse CI, repeatable lab traces, asset waterfall, static-route
  proof, and the approved desktop/mobile browser matrix pass the stated thresholds.
- [ ] **AC-23 — SEO crawl** (`SEO-01`–`SEO-04`): generated metadata snapshots,
  sitemap/robots crawl, `hreflang`/canonical validation, social-card previews, and
  structured-data validation pass for both locales and representative Projects.
- [ ] **AC-24 — Privacy configuration** (`PRIV-02`–`PRIV-06`, `PRIV-08`):
  signed data inventory and assessments, provider/DPA/transfer records, retention
  settings and deletion tests, notice-to-network comparison, Contact notice, rights
  process, and re-review checklist all match production.
- [ ] **AC-25 — Security review** (`SEC-01`–`SEC-06`): MFA/least-privilege inventory,
  secret scan, client-bundle inspection, HTTPS/header scan, log-redaction test,
  authenticated-preview abuse tests, dependency scan, and incident drill pass.
- [ ] **AC-26 — Cloudflare envelope** (`OPS-01`–`OPS-04`): current official limits
  are recorded; dry run, static inventory, workerd CPU tests, and route proofs remain
  inside the active Free-plan envelope.
- [ ] **AC-27 — Delivery topology** (`OPS-05`–`OPS-08`): protected-hook,
  failed-build, branch-preview, fallback rehearsal/documentation, and portability
  review prove atomic deployment and the defined escape route.
- [ ] **AC-28 — Operational drill** (`OPS-10`): the owner observes a full preview,
  publication, Contact, deletion, rollback, export, and restore rehearsal after final
  provider configuration.
- [ ] **AC-29 — Specification approval** (`APPROVAL-01`–`APPROVAL-03`): the release
  record links Ivo's approved specification revision and every approved amendment;
  there are no unresolved contradictions or substitutions.
- [ ] **AC-30 — Release approval** (`APPROVAL-04`, `APPROVAL-05`): evidence is
  complete, exceptions are explicitly listed, and Ivo records authorization before
  the first production deployment.

## 11. Requirement-to-decision traceability matrix

| Decision ticket | Requirement coverage |
| --- | --- |
| [Survey modern TUI interface patterns for the portfolio](https://github.com/igrgin/portfolio-page-terminal/issues/2) | `SUCCESS-02`–`SUCCESS-04`, `UX-02`–`UX-13`, `A11Y-01`–`A11Y-06` |
| [Evaluate React component foundations for a custom TUI](https://github.com/igrgin/portfolio-page-terminal/issues/3) | `TECH-03`, `TECH-04`, `TECH-16`, `A11Y-01`–`A11Y-03` |
| [Evaluate React architecture and near-zero-cost hosting](https://github.com/igrgin/portfolio-page-terminal/issues/4) | `SCOPE-05`, `TECH-01`, `TECH-02`, `TECH-05`, `TECH-06`, `OPS-01`–`OPS-08` |
| [Evaluate single-owner bilingual CMS options and hosting integrations](https://github.com/igrgin/portfolio-page-terminal/issues/5) | `CONTENT-01`–`CONTENT-04`, `EDITORIAL-01`, `EDITORIAL-07`, `EDITORIAL-13`, `TECH-01`, `TECH-05` |
| [Define the portfolio privacy and compliance baseline](https://github.com/igrgin/portfolio-page-terminal/issues/6) | `PRIV-01`–`PRIV-08`, `SEC-01`–`SEC-06`, `TECH-07`–`TECH-12`, `TECH-17` |
| [Evaluate near-zero-cost contact-form delivery](https://github.com/igrgin/portfolio-page-terminal/issues/7) | `TECH-07`, `TECH-10`–`TECH-12`, `PRIV-03`–`PRIV-06` |
| [Evaluate privacy-friendly portfolio analytics](https://github.com/igrgin/portfolio-page-terminal/issues/8) | `SCOPE-07`, `TECH-17`, `PRIV-01`, `PRIV-07`, `OPS-09` |
| [Evaluate repository-authored project narratives](https://github.com/igrgin/portfolio-page-terminal/issues/9) | `SCOPE-07`, `CONTENT-21` |
| [Compare Mermaid and PlantUML for portfolio diagrams](https://github.com/igrgin/portfolio-page-terminal/issues/10) | `TECH-13`–`TECH-15`, `PERF-01`, `PERF-04` |
| [Prototype the public TUI visual system](https://github.com/igrgin/portfolio-page-terminal/issues/11) | `SCOPE-01`–`SCOPE-04`, `IA-06`, `IA-07`, `UX-01`–`UX-05`, `UX-14` |
| [Define the bilingual portfolio content model](https://github.com/igrgin/portfolio-page-terminal/issues/12) | `CONTENT-01`–`CONTENT-20`, `IA-04`, `SEO-01`, `SEO-04` |
| [Choose the application, content, and deployment stack](https://github.com/igrgin/portfolio-page-terminal/issues/13) | `TECH-01`–`TECH-06`, `TECH-16`, `OPS-01`–`OPS-08` |
| [Define the project case-study authoring experience](https://github.com/igrgin/portfolio-page-terminal/issues/14) | `EDITORIAL-02`–`EDITORIAL-04`, `CONTENT-13`–`CONTENT-15`, `TECH-13`–`TECH-15` |
| [Define the Contact experience](https://github.com/igrgin/portfolio-page-terminal/issues/15) | `CONTENT-07`, `CONTENT-18`, `TECH-07`–`TECH-12`, `PRIV-03`, `PRIV-04` |
| [Decide whether to include analytics](https://github.com/igrgin/portfolio-page-terminal/issues/16) | `SCOPE-07`, `TECH-17`, `PRIV-07`, `OPS-09` |
| [Prototype the bilingual editorial and release workflow](https://github.com/igrgin/portfolio-page-terminal/issues/17) | `CONTENT-02`, `CONTENT-20`, `EDITORIAL-01`–`EDITORIAL-13`, `OPS-05`, `OPS-10` |
| [Define the implementation-ready specification handoff](https://github.com/igrgin/portfolio-page-terminal/issues/18) | `IA-01`–`IA-05`, `UX-05`, `PERF-02`, `PERF-03`, `PERF-05`, `APPROVAL-01`–`APPROVAL-05`, `AC-01`–`AC-30` |
