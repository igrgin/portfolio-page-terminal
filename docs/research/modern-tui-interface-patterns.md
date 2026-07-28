# Modern TUI interface patterns for the portfolio

**Status:** Decision research

**Date:** 2026-07-28

**Question:** Which visual, interaction, typography, color, density, and responsive patterns from Claude Code, Codex CLI, Gemini CLI, and other strong modern TUIs can be adapted into an accessible, tasteful portfolio without copying a product or creating a command-driven experience?

## Decision

Adopt a **web-native operational TUI** as the visual baseline.

The portfolio should feel like a modern developer tool because it has a clear shell, bordered panes, compact contextual metadata, explicit active and status states, and progressive disclosure. It should still behave like a conventional website: every primary destination is a real link with a shareable URL; every action is a labelled button or link; pointer, touch, and normal `Tab` navigation are first-class; and no visitor has to type or learn commands.

The baseline should combine:

- Claude Code's progressive disclosure and restrained status presentation;
- Codex CLI's typography hierarchy and deliberately small semantic color vocabulary;
- Gemini CLI's explicit theme-token model and equal treatment of light and dark themes;
- Lazygit's responsive pane hierarchy and unmistakable active pane;
- btop's principle that visually terminal-like controls remain pointer-operable.

This is a synthesis, not a visual copy of any product. Do not recreate a prompt composer, chat transcript, model selector, fake shell, or another product's brand palette.

## What the primary references contribute

### Claude Code: show the path first, details on demand

Claude Code's interface keeps a compact task list in the status area, collapses repeated or verbose tool activity, offers a focused view with only the latest prompt, a one-line tool summary, and the final response, and exposes deeper transcript detail separately. Its footer can also contain a directly clickable PR link with both a text label and a colored review state. These are strong examples of progressive disclosure: the default surface remains scannable while detail is still reachable. ([Interactive mode](https://code.claude.com/docs/en/interactive-mode), [commands reference](https://code.claude.com/docs/en/commands))

Claude Code can automatically match a terminal's light or dark appearance and supports semantic custom-theme tokens rather than requiring one fixed palette. Its status line guidance explicitly warns that long output truncates or wraps awkwardly, especially at narrow widths. ([Terminal configuration](https://code.claude.com/docs/en/terminal-config), [status-line guidance](https://code.claude.com/docs/en/statusline))

**Adapt for the portfolio**

- Keep each view's primary story visible without expansion.
- Use disclosures for project implementation detail, supporting technologies, and optional evidence—not for essential biography, dates, titles, or calls to action.
- Limit the global status/header rail to durable context: current section, language, theme, and résumé access.
- Give every state a word or recognizable symbol as well as a color.

**Do not adapt**

- Chat chronology, prompt syntax, permission dialogs, or a fake input cursor.
- Shortcut-heavy interaction as the primary way to navigate.
- Constant animated “working” states; a portfolio is mostly static content.

### Codex CLI: default text, dim secondary text, and a narrow semantic palette

Codex's own TUI style guide uses bold for headings, terminal-default foreground for primary text, and dim text for secondary information. It reserves a small set of colors for selection/status, success/additions, errors/deletions, and product identity, and explicitly advises against hardcoded white, black, or arbitrary custom colors that may fail against different terminal themes. ([Codex TUI style guide, commit `155c3e2`](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/tui/styles.md))

Codex separates committed transcript content from an in-flight mutable cell and exposes detail in an overlay. Its configuration also distinguishes theme, status-line items, tooltips, animations, alternate-screen behavior, and a copy-friendly raw-output mode. The relevant lesson is not to reproduce those controls, but to keep content, transient state, and secondary detail as separate presentation layers. ([main chat surface, commit `155c3e2`](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/tui/src/chatwidget.rs), [TUI configuration schema, commit `155c3e2`](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/core/config.schema.json))

**Adapt for the portfolio**

- Use weight, spacing, and default text color before reaching for another accent.
- Use muted text only for genuinely secondary metadata, never for long body copy.
- Keep one primary accent, with separate success, warning, and danger tokens used only when their meanings apply.
- Treat focus, hover, selected navigation, and publication/status badges as different states rather than recoloring the same state.

**Do not adapt**

- ANSI's technical palette limitations. The website should use CSS semantic tokens and verify contrast in both themes.
- Dense unwrapped transcripts or raw terminal output as a page-layout model.

### Gemini CLI: semantic theme tokens and accessibility escape hatches

Gemini CLI's custom themes separate primary and secondary text, links, accents, primary background, diff backgrounds, default and focused borders, and success/warning/error status colors. It ships multiple light and dark themes, remembers selection, and can automatically switch based on the terminal background. ([Gemini CLI themes](https://geminicli.com/docs/cli/themes/), [configuration reference](https://github.com/google-gemini/gemini-cli/blob/d29268d360fd9fb71342c2add9b1244725ae08b8/docs/reference/configuration.md))

Its UI settings also make compact output, footer labels, shortcut hints, background color, spinners, and other layers independently optional, and it provides a plain-text screen-reader mode. The presence of a dedicated screen-reader mode is evidence that visual TUI structure does not automatically produce an accessible semantic experience; the web implementation must supply that semantic layer from the outset. ([configuration reference, commit `d29268d`](https://github.com/google-gemini/gemini-cli/blob/d29268d360fd9fb71342c2add9b1244725ae08b8/docs/reference/configuration.md))

**Adapt for the portfolio**

- Define the two color themes from the same semantic token contract.
- Make the focused border a first-class token, separate from the decorative pane border.
- Pair compact status indicators with visible labels.
- Let non-essential visual layers disappear at narrow widths without removing content or actions.

**Do not adapt**

- Theme proliferation. The first release needs one deliberately designed light theme and one dark theme.
- A separate “accessible mode.” The normal website must meet the accessibility target.

### Broader TUI references: panes should respond, and everything should remain operable

Lazygit makes pane layout responsive: its main split can change orientation when width is constrained, its portrait mode can stack components automatically, and focused and unfocused panes use different border treatments. It also allows a selected pane to expand from normal to half or full screen and wraps long staging text. ([Lazygit configuration, commit `df0943a`](https://github.com/jesseduffield/lazygit/blob/df0943ad334d1d3626b42057aad4b69324da3516/docs/Config.md))

btop supports mouse interaction for its visible controls, layout presets, multiple symbol densities, and a reduced TTY mode when richer rendering is unavailable. The transferable idea is graceful reduction of visual fidelity without loss of operation. ([btop README, commit `20d6656`](https://github.com/aristocratos/btop/blob/20d665608bd4e4f9673285b48dda0815a644d3bc/README.md))

K9s skins distinguish body, information, help, frame, border, focused border, table, and dialog styling, and allow icons or decorative chrome to be suppressed. That supports using role-based visual tokens rather than styling each portfolio component independently. ([K9s README and skin model, commit `436ea2e`](https://github.com/derailed/k9s/blob/436ea2e9f23c5dd2d8e05c3e974220657524ef17/README.md))

## Design rules for the visual prototype

### 1. Shell and pane hierarchy

Use a restrained application shell:

1. A compact top rail contains the owner's name/wordmark and global actions: language, theme, and résumé.
2. A desktop navigation pane lists About Me, Experience, Education, Skills, Projects, and Contact.
3. A primary content pane contains the current routed view.
4. A contextual rail is allowed only where it adds real value, such as a project table of contents or key facts. It must not be an empty decorative third column.

On desktop, pane borders establish regions without making every card a box inside another box. Use one-pixel borders and little or no corner rounding; spacing and typographic alignment should do most of the grouping. The active navigation item should combine at least three cues: a text label, a marker or weight change, and a border/background change.

The shell must not include fake terminal window controls, a shell prompt, a blinking caret, simulated boot text, or a status bar filled with invented system metrics.

### 2. Typography

Do **not** set the entire site in monospace. Monospace is effective for the shell, navigation labels, section eyebrows, dates, tags, compact facts, and short headings. Use a highly legible proportional face for biographies, experience descriptions, and project narratives.

The strongest starting pair for the prototype is **IBM Plex Mono + IBM Plex Sans**. IBM's own developer typography guidance uses Plex Mono to evoke coding environments and Plex Sans alongside it for informative and supporting text; the family is open source under the SIL Open Font License. ([IBM developer typography](https://www.ibm.com/brand/experience-guides/developer/brand/typography/), [IBM Plex repository](https://github.com/IBM/plex))

The prototype should compare that pair against **Atkinson Hyperlegible Mono + Atkinson Hyperlegible Next** if the latter's characterful shapes still fit the visual direction. The Braille Institute designed the family around character distinction and provides both proportional and monospaced versions. ([Braille Institute font page](https://www.brailleinstitute.org/freefont/))

Whichever pair wins must be verified with:

- English and Croatian samples, including `č ć đ š ž` and uppercase equivalents;
- long project prose, résumé-like lists, dates, code identifiers, and URLs;
- regular, 200% zoom, and text-spacing override tests;
- dark and light rendering on macOS, Windows, Android, and iOS system rasterizers;
- local hosting/subsetting so the site does not depend on a font CDN or expose visitors to an unnecessary third party.

Starting type roles for the prototype:

| Role | Treatment |
| --- | --- |
| Long-form body | Proportional, `1rem` minimum, approximately `1.55` line height, comfortable measure around `60–72ch` |
| Primary page title | Mono or proportional; test both, bold rather than oversized |
| Navigation and controls | Mono, medium weight, never below a comfortably readable size |
| Metadata, dates, tags | Mono, compact but not low-contrast |
| ASCII accent | Mono, decorative and `aria-hidden`; provide equivalent real text nearby |

WCAG 2.2 requires that content survive user overrides for line, paragraph, letter, and word spacing, so fixed-height text containers and clipped labels are disallowed. ([WCAG 2.2 text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing))

### 3. Color and light/dark themes

Define both themes through the same semantic tokens:

```text
canvas
surface
surface-raised
text
text-muted
border
border-strong
focus
accent
accent-subtle
link
success
warning
danger
selection
```

Start with neutral surfaces and a cool cyan/teal primary accent. Use a warmer amber only for genuine attention states and a restrained magenta or violet only as a personal signature accent if the prototype needs it. At normal reading density, no pane should present more than one saturated accent plus a semantic status color.

Both themes must be designed independently against the token contract, not produced by mechanically inverting values. Body text and small labels must meet at least the WCAG AA `4.5:1` contrast requirement, while UI boundaries and focus treatment need their applicable non-text contrast checks. ([WCAG 2.2](https://www.w3.org/TR/WCAG22/))

Color is never the only carrier of meaning: selected, featured, current, success, warning, or error states also require a label, icon/shape, border, or typographic cue. ([WCAG 2.2: use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color))

Avoid:

- pure black against pure white as the default palette;
- neon text across whole paragraphs;
- low-opacity muted copy that fails contrast;
- gradients inside body text;
- different accent palettes per section;
- CRT scanlines, glow on all text, chromatic aberration, Matrix rain, and flicker.

### 4. Density and progressive disclosure

Aim for **compact chrome and comfortable content**:

- use an 8-pixel spacing scale as a starting point;
- let shell labels and metadata be compact;
- give narrative content normal web reading rhythm;
- prefer one clean separator over nested cards;
- show a concise project summary and key facts before architecture detail;
- disclose secondary implementation notes, galleries, and long technology lists with labelled controls;
- never hide the primary CTA, job title, employer, degree, dates, or project outcome behind a disclosure.

Pointer targets must meet WCAG 2.2 AA's minimum target-size or spacing rule; in practice, important navigation and global controls should aim above the `24 × 24` CSS-pixel minimum and use approximately `40–44` pixel rows on touch layouts. ([WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html))

Use native `<details>`/`<summary>` where it fits, or implement the WAI-ARIA disclosure pattern with a button, `aria-expanded`, and normal `Enter`/`Space` behavior. ([WAI-ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/))

### 5. Responsive behavior

Responsive behavior is a change in composition, not a scaled-down desktop terminal.

| Width/context | Composition |
| --- | --- |
| Wide desktop | Top rail + persistent navigation pane + main content; contextual rail only on content that needs it |
| Narrow desktop/tablet | Narrower navigation rail or a top-level navigation row; main content owns the width; contextual rail moves inline |
| Mobile and high zoom | Single content column; top rail wraps or simplifies; navigation becomes a labelled disclosure/drawer; project facts stack before narrative |

The page itself must not scroll horizontally at a width equivalent to `320` CSS pixels. Diagrams, tables, and code samples may have their own bounded horizontal scroll areas when their two-dimensional layout is meaningful, but the surrounding text and controls must reflow. ([WCAG 2.2 reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow))

At narrow widths:

- remove decorative borders before reducing font size;
- move status metadata into the content rather than truncating essential values;
- replace multi-column comparisons with stacked blocks;
- keep the current section's label visible;
- avoid fixed sidebars and large sticky footers that obscure focused content;
- keep the language, theme, résumé, and navigation controls reachable in one obvious header action group.

### 6. Interaction, focus, and motion

Primary navigation is a collection of semantic links, not an ARIA tab widget: each destination has its own URL and should retain normal browser behaviors such as open-in-new-tab, history, and link previews. Tabs are acceptable only for a genuinely layered control inside one view, and then they should follow the WAI-ARIA tab keyboard model. ([WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/))

Keyboard focus should deliberately echo the TUI active-pane language: use a high-contrast outer outline or border plus a local background/marker change. Never remove the browser outline until an equally visible replacement exists. WCAG 2.2 AA requires a visible focus indicator. ([WCAG 2.2 focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible))

Use motion only to clarify a state transition:

- `100–180ms` opacity, border-color, or small transform transitions are sufficient;
- no looping animation in the normal reading experience;
- no fake typing effect for essential copy;
- disable non-essential transitions under `prefers-reduced-motion`;
- never animate layout in a way that moves the reader's current target.

W3C guidance recommends eliminating unnecessary motion and honoring reduced-motion preferences for non-essential interaction animation. ([WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions))

### 7. ASCII art and terminal effects

ASCII is a signature, not a layout primitive.

- Permit one short, responsive wordmark or illustration on About Me and perhaps a small project-specific accent.
- Render it as preformatted text only when it survives narrow widths; otherwise replace it with a compact variant.
- Mark decorative ASCII `aria-hidden="true"` and place the equivalent name or meaning in ordinary text.
- Do not use ASCII for navigation, skills charts, timelines, diagrams, or any information that must be parsed by assistive technology.
- Do not animate it by typing, glitching, or flickering.

## Prototype brief produced by this research

The visual prototype should test two real routes, not a component gallery:

1. **About Me**: profile photo, positioning, short biography, featured evidence, and the three calls to action.
2. **Project detail**: backend-project summary, role, architecture diagram placeholder, technical decisions, outcomes, technologies, and repository link.

It must render:

- wide desktop, narrow desktop/tablet, and `320` CSS-pixel mobile/high-zoom compositions;
- complete light and dark token sets;
- English and Croatian text;
- IBM Plex and Atkinson paired-typeface variants;
- default, hover, focus-visible, active/current, expanded, and error states;
- normal and reduced-motion behavior.

The prototype succeeds when:

- a non-technical hiring manager can identify role, strongest evidence, projects, résumé, and contact path without learning a convention;
- the TUI character remains recognizable with color removed;
- both themes meet contrast checks;
- all essential interactions work by pointer, touch, and keyboard;
- no essential content is lost at `320` CSS pixels or 200% zoom;
- the visual system still feels calm when real résumé-length content replaces placeholders.

## Rejected directions

- **Literal terminal simulation:** conflicts with the explicit no-command requirement and weakens normal website navigation.
- **All-monospace typography:** makes long recruiting and case-study prose harder to scan and turns an aesthetic cue into a reading tax.
- **Retro CRT styling:** scanlines, glow, flicker, noise, and fake boot sequences compete with evidence of engineering work and create motion/contrast risks.
- **Dashboard maximalism:** invented metrics and dense charts imply operational meaning that the portfolio does not have.
- **Product imitation:** copying Claude Code, Codex, or Gemini layout and colors would make the result feel derivative; only their general interaction and hierarchy principles are retained.
- **Desktop-first fixed panes:** a terminal-sized grid does not reflow well enough for mobile or high zoom.

## Sources

All product findings use first-party documentation or official repositories. Repository links are pinned to the revisions inspected on 2026-07-28.

- Anthropic: [Claude Code interactive mode](https://code.claude.com/docs/en/interactive-mode), [terminal configuration](https://code.claude.com/docs/en/terminal-config), [status line](https://code.claude.com/docs/en/statusline), and [commands](https://code.claude.com/docs/en/commands)
- OpenAI: [Codex TUI style guide](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/tui/styles.md), [chat surface](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/tui/src/chatwidget.rs), and [configuration schema](https://github.com/openai/codex/blob/155c3e299c3ad6a033eba8837e7b3b57901271f8/codex-rs/core/config.schema.json)
- Google: [Gemini CLI themes](https://geminicli.com/docs/cli/themes/) and [configuration reference](https://github.com/google-gemini/gemini-cli/blob/d29268d360fd9fb71342c2add9b1244725ae08b8/docs/reference/configuration.md)
- Lazygit: [responsive pane and theme configuration](https://github.com/jesseduffield/lazygit/blob/df0943ad334d1d3626b42057aad4b69324da3516/docs/Config.md)
- btop: [README and UI capabilities](https://github.com/aristocratos/btop/blob/20d665608bd4e4f9673285b48dda0815a644d3bc/README.md)
- K9s: [README and skin model](https://github.com/derailed/k9s/blob/436ea2e9f23c5dd2d8e05c3e974220657524ef17/README.md)
- W3C WAI: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing), [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color), [focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [motion](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions), [disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), and [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- IBM: [developer typography guidance](https://www.ibm.com/brand/experience-guides/developer/brand/typography/) and [IBM Plex](https://github.com/IBM/plex)
- Braille Institute: [Atkinson Hyperlegible family](https://www.brailleinstitute.org/freefont/)
