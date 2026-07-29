# Portfolio

Production workspace for Ivo Grgin's bilingual TUI-styled portfolio.

## Workspace

- `apps/web` — TypeScript Next.js App Router application
- `apps/studio` — independently buildable Sanity Studio
- `packages/ui` — portfolio-owned UI boundary, shadcn source scaffold, Base UI
  primitives, and semantic TUI tokens
- `packages/content` — shared content contracts and generated-type boundary

Install the exact lockfile with Node.js 22.13 or newer:

```sh
npm ci
```

Run the applications independently:

```sh
npm run dev:web
npm run dev:studio
```

The Studio uses a non-production placeholder project ID until provider provisioning is
completed. Set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` to connect an
authorized Sanity project.

Static Web builds read published content through Sanity's CDN. Set
`SANITY_PROJECT_ID`, `SANITY_DATASET`, and the public HTTPS origin in
`NEXT_PUBLIC_SITE_ORIGIN` in the Web build environment. A configured build fails
before deployment when published About Me content or its required local assets are
invalid, preserving the last successful public site. When Sanity variables are absent,
local builds deliberately leave localized content routes unpublished rather than
inventing fallback content.

Run the complete local quality gate:

```sh
npm run check
```

Individual build commands are `npm run build:web` and `npm run build:studio`.
