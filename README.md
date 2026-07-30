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
authorized Sanity project. Set `SANITY_STUDIO_PREVIEW_ORIGIN` to the public Web
application origin used by the persistent Project preview; it defaults to
`http://localhost:3000` for local development. The preview renders the real published
Project route. Authenticated draft data is intentionally reserved for the later Draft
Mode workflow.

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

## Conditional Contact form

The Contact form is omitted unless its SES runtime configuration is complete and
every release gate below is exactly `true`:

- `CONTACT_FORM_ENABLED`
- `CONTACT_FORM_DELIVERY_GATE`
- `CONTACT_FORM_PROCESSOR_GATE`
- `CONTACT_FORM_TRANSFER_GATE`
- `CONTACT_FORM_RETENTION_GATE`
- `CONTACT_FORM_SECURITY_GATE`
- `CONTACT_FORM_PRIVACY_GATE`

The runtime also requires `CONTACT_SES_REGION` (an approved EEA SES region),
`CONTACT_SES_FROM`, `CONTACT_SES_TO`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `CONTACT_RATE_LIMIT_SECRET` (at least 32
characters). Store credentials and the rate-limit secret only in deployment
secrets. The endpoint permits five requests per HMAC-derived client token and
50 requests route-wide per 60-second runtime window; Amazon SES must remain
sandboxed as the final cap. The rate-limit boundary must be backed by the
deployment platform before the delivery gate is enabled across more than one
runtime instance. The endpoint creates no payload store and emits no submission
or provider logs.
