# Portfolio

This context defines the product language for a personal software-engineering portfolio presented through a terminal-inspired visual system.

## Language

**TUI-styled website**:
A conventional, clickable website whose visual language is inspired by modern terminal user interfaces. It does not require visitors to type or learn commands.
_Avoid_: Terminal emulator, command-driven portfolio

**About Me**:
The portfolio's landing view, combining a concise professional introduction, current focus, selected strengths, and featured work.
_Avoid_: Overview, Home dashboard

**Contact**:
The dedicated view listing every published Contact channel and, when enabled, an in-page contact form. Direct channels remain available whether or not the form is present.
_Avoid_: Contact Me footer, form-only contact

**Contact channel**:
A published way to reach or follow the portfolio owner, such as email, phone, LinkedIn, or GitHub.
_Avoid_: Social icon

**Product analytics**:
Intentional measurement used to understand visitor traffic, acquisition, or behavior, including aggregate visit, referral, and content-popularity reporting.
_Avoid_: Operational log, required hosting telemetry

**Operational log**:
A hosting-provider record required to secure, operate, or diagnose the website. It is not queried or repurposed to understand visitor traffic, acquisition, or behavior.
_Avoid_: Analytics log, visitor analytics

**Relevant subject**:
An intentionally selected academic course or subject that supports the professional knowledge presented by an Education entry. It is not a complete transcript.
_Avoid_: Selected highlight, coursework dump

**Project**:
A publish-safe body of work presented as either a full case study or a summary-only entry, with the portfolio owner's contribution made explicit. Work that cannot be safely explained is not a public Project.
_Avoid_: Repository card, private project placeholder

**Résumé set**:
The paired English and Croatian general-purpose résumé PDFs published together, accompanied by a note that they provide a broad overview rather than targeting a specific role.
_Avoid_: Tailored application résumé, CV bundle

**Localized version**:
One complete language edition of the portfolio, authored naturally for its audience. English and Croatian have equal factual coverage, while official titles, proper names, and established English industry terms may remain unchanged when that is idiomatic Croatian usage.
_Avoid_: Translation mode, secondary language, literal translation

**Publication batch**:
A dependency-complete group of content changes treated as one bilingual editorial unit from review through publication. Publication makes the group available to deployment but does not by itself make it live.
_Avoid_: Sanity Content Release, individual publish, deployment

**Implementation specification**:
The authoritative, version-controlled contract in `SPEC.md` that consolidates settled product and technical requirements for implementation. Linked Wayfinder tickets retain the decision history and rationale rather than competing with the specification.
_Avoid_: Planning notes, issue dump, implementation plan

**Source-visible portfolio repository**:
The public source repository shared for evaluation of the portfolio implementation
without granting a license to copy, modify, or redistribute it. Public visibility
allows technical cloning and forking but does not make the portfolio open source.
_Avoid_: Open-source project, reusable portfolio template

**Skill evidence**:
A publish-safe account of where a public Skill has been applied, expressed through portfolio work or a precisely scoped note when the underlying work is confidential or unpublished.
_Avoid_: Skill rating, proficiency percentage, unsubstantiated claim

**Skill**:
A named technical capability described by what the portfolio owner can do and supported by Skill evidence. It may use a recognition icon, but it is never represented by an unsupported self-rating.
_Avoid_: Technology badge, proficiency score
