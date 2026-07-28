# React component foundations for a custom TUI

## Decision

Use **shadcn/ui with its current Base UI foundation** as the portfolio's component baseline. Treat shadcn/ui as an owned source-code scaffold, not as the visual design system: install only the components the site needs, replace the default look with portfolio-specific TUI tokens and variants, and use semantic HTML directly for simple content and navigation.

This choice gives the project the best balance of:

- fast access to complete, higher-level React components;
- direct ownership of the component source and markup wrappers;
- unstyled, accessibility-oriented behavior from Base UI underneath;
- a coherent CSS-variable and Tailwind theming path for light and dark modes;
- no shadcn component runtime package or runtime styling engine; and
- the ability to diverge substantially from shadcn's default visual language without fighting a vendor theme.

The recommendation is specifically **shadcn/ui + Base UI**, not “whatever shadcn defaults to at implementation time.” As of July 2026, shadcn makes Base UI the default and describes it as stable, while continuing to support Radix ([shadcn/ui, “Base UI as the Default”](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)).

## Decision boundary

This decision selects the behavior and component-code foundation. It does not select the final TUI design, typography, responsive shell, or exact theme palette.

No candidate provides WCAG 2.2 AA conformance by installation. Component libraries can supply semantics, focus management, and keyboard interaction, but the application still owns labels, contrast, focus visibility, reflow, target sizes, content, and testing. WCAG 2.2 AA includes application-level requirements such as contrast, reflow, visible/unobscured focus, and minimum target size ([W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Base UI itself explicitly says developers must supply visible focus styling, color contrast, and accessible names ([Base UI accessibility](https://base-ui.com/react/overview/accessibility)).

## Evaluation

| Foundation | Accessibility foundation | Markup and styling control | Theme and responsive fit | Runtime and bundle profile | Ownership and maintenance | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **shadcn/ui + Base UI** | Base UI handles ARIA roles, keyboard interaction, pointer interaction, and focus management, and is tested across devices, browsers, and screen readers. Application-level WCAG work remains. | Highest practical control. shadcn copies the top-layer code into the repository; Base UI is unstyled and exposes component parts. | Strong. shadcn uses semantic CSS variables and supports light/dark token overrides. Responsive pane composition remains ordinary Tailwind/CSS owned by the site. | shadcn is source distribution rather than a component runtime. Base UI adds no CSS, is tree-shakable, and can be imported by component. Generated Tailwind CSS is build-time output. | Local ownership makes bespoke TUI work and debugging straightforward. Cost: upstream fixes are not automatically inherited, so generated components must be deliberately reviewed and updated. | **Selected.** Best balance of speed, control, and maintainable accessibility behavior for a small bespoke site. |
| **Base UI directly** | Same underlying accessibility behavior as the selected option. | Excellent node-level and CSS control; no preset wrappers or styles. | Excellent; entirely application-defined. | Excellent documented baseline: no bundled CSS and tree-shakable component imports. | Clean dependency updates, but the project must design and maintain every higher-level wrapper and state style itself. | Strong fallback, but creates avoidable component-system work for this portfolio. |
| **React Aria Components** | Strongest documented cross-input and internationalization story in the shortlist. It supplies semantics, announcements, keyboard/pointer behavior, focus management, Croatian locale support, and broad screen-reader testing. | High. Components are unstyled, generally render one DOM element each, expose state data attributes, and allow lower-level hooks when more control is needed. | Excellent for custom CSS/Tailwind and responsive input behavior. Light/dark tokens are application-owned. | No bundled styles; subpath imports are documented. Its broader interaction and localization machinery should be measured in the real build rather than assumed to be free. | Conventional dependency upgrades are easier than maintaining copied components. Its API and abstractions are a separate system the project would need to wrap consistently. | Best alternative if testing exposes a Base UI accessibility/input gap or the site grows interaction-heavy. More capability than the initial portfolio needs. |
| **Radix Primitives directly** | Follows WAI-ARIA authoring practices and handles roles, keyboard navigation, and focus management for common patterns. | Excellent. Unstyled component parts and `asChild` provide granular rendered-element control. | Excellent; themes and layout are application-owned. | Tree-shakeable and incrementally adoptable; only used primitives need ship. | Mature and proven, but direct adoption still requires building the portfolio's complete wrapper layer. shadcn continues to support it, but now recommends Base UI for new work. | Safe fallback if Base UI causes a concrete compatibility problem; no current reason to prefer it for this new project. |

### Why shadcn/ui wins here

shadcn/ui is intentionally not a traditional opaque component package: it hands the project the component source and describes the result as the project's own component library ([shadcn/ui introduction](https://ui.shadcn.com/docs)). That is unusually well matched to a TUI-styled website, where familiar controls are needed but their borders, density, typography, active indicators, and panel grammar must look nothing like a generic dashboard.

Base UI supplies the difficult interaction layer without prescribing CSS. Its official documentation states that components are unstyled, bundle no CSS, work with Tailwind or other styling systems, expose each node for composition, support React 17+, and are tested against WAI-ARIA patterns across devices and assistive technologies ([Base UI overview](https://base-ui.com/react/overview/about)). Its package is tree-shakable, so only imported components should enter the application bundle ([Base UI quick start](https://base-ui.com/react/overview/quick-start)).

shadcn's theme model also maps naturally to two deliberately designed modes: semantic CSS variables drive surfaces, text, borders, controls, and focus rings, with dark mode overriding the same tokens ([shadcn/ui theming](https://ui.shadcn.com/docs/theming)). Its Vite example includes `light`, `dark`, and `system` states plus persisted preference, matching the desired behavior ([shadcn/ui dark mode for Vite](https://ui.shadcn.com/docs/dark-mode/vite)).

### Why not Base UI directly

Base UI direct would minimize scaffolded code and is technically capable of the same result. Its own quick start, however, points to shadcn/ui when a project needs pre-styled components and higher-level abstractions. Starting directly from Base UI would make the portfolio team define every shared wrapper, variant convention, error state, and composed control before it can evaluate the actual visual direction. shadcn provides those seams immediately, and the copied code can then be simplified.

### Why not React Aria Components

React Aria Components are a credible, accessibility-led alternative. They are unstyled, expose interaction states for CSS, generally map each component part to one DOM element, work across React frameworks, and allow dropping to hooks for unusual markup ([React Aria getting started](https://react-aria.adobe.com/getting-started)). React Aria also explicitly supports Croatian and normalizes mouse, touch, keyboard, focus, and assistive-technology interactions ([React Aria quality](https://react-aria.adobe.com/quality)).

That breadth is valuable, but the portfolio's public interface is mostly documents, links, tabs/navigation, a theme and locale switch, and perhaps a contact form. It does not currently need rich collections, date controls, drag-and-drop, or advanced selection. shadcn + Base UI reaches the required capability with ready higher-level components and source ownership. React Aria should be reconsidered only if a prototype or accessibility test demonstrates a specific interaction requirement that Base UI does not satisfy.

### Why not Radix directly

Radix remains a mature option. It is unstyled, follows WAI-ARIA patterns, exposes component parts and rendered-element control, and is tree-shakeable ([Radix Primitives introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)). It loses on project fit rather than quality: using it directly recreates the wrapper and variant work that shadcn already supplies, while shadcn now recommends Base UI for new projects. Keep Radix as a bounded fallback, not a second foundation used alongside Base UI.

## Implementation constraints

1. **Pin the foundation.** Initialize shadcn/ui with Base UI explicitly and record the choice in configuration. Do not let a future CLI default silently change the primitive layer.
2. **Install minimally.** Begin with Button, Dialog/Drawer as needed for mobile navigation, Field/Input/Textarea for Contact, Tooltip only where a visible label is impossible, and any navigation primitive proven useful by the prototype. Do not install the whole catalog.
3. **Use native HTML first.** Page landmarks, headings, project links, résumé links, lists, articles, and ordinary navigation should remain semantic HTML/React components. A primitive is justified when it supplies non-trivial keyboard, focus, overlay, or form behavior.
4. **Create TUI tokens before restyling components.** Define semantic light and dark tokens for page/panel surfaces, primary and muted text, borders, accent states, destructive states, and focus rings. Add typography, spacing, line-height, radius, and motion tokens owned by the portfolio rather than editing one-off utilities across components.
5. **Treat shadcn output as forked code.** Review generated code before committing. Never run an overwrite update across customized components without a diff and regression test; shadcn's own Tailwind migration guidance warns that the CLI can overwrite local components ([shadcn/ui Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4)).
6. **Keep Base UI behind local wrappers.** Application views import portfolio components, not Base UI primitives directly. This keeps visual rules consistent and preserves a realistic migration seam.
7. **Test the application, not the library's claims.** Require keyboard-only navigation, focus-order and focus-visibility checks, screen-reader smoke tests, automated accessibility checks, contrast verification in both modes, 200% zoom/reflow checks, reduced-motion behavior, and touch-target checks at representative mobile widths.
8. **Measure production output.** Add a bundle report to the implementation acceptance checks and set a project budget after the first representative shell is built. Official tree-shaking claims are useful direction, not evidence of the final application's payload.

## Reconsideration triggers

Reopen this decision only if one of these occurs during prototyping:

- Base UI cannot produce a required semantic structure or interaction without fragile workarounds;
- keyboard, touch, or screen-reader testing reveals a reproducible primitive-level issue;
- the chosen React framework is unsupported by the pinned versions;
- the customized shadcn layer becomes materially harder to update than a small direct Base UI wrapper set; or
- the interface grows into rich data collections or advanced cross-input interactions where React Aria's additional capabilities provide clear value.

Do not mix Base UI, React Aria, and Radix casually at the component layer. Multiple primitive systems increase behavior inconsistency, duplicate concepts and dependencies, and make accessibility regression testing harder.
