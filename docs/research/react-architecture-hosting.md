# React architecture and near-zero-cost hosting

_Researched 2026-07-28. Sources are first-party documentation._

## Question

Which React application architecture and hosting option best supports localized
shareable routes, static-first performance, CMS previews, project pages, small
isolated serverless integrations, free initial hosting, preview deployments,
portability, and a later custom domain?

## Decision

Use **Next.js App Router** as a **static-first hybrid application**, deployed
first to **Cloudflare Workers Free through the Cloudflare OpenNext adapter**.

Pre-render every public English and Croatian route at build time. Keep a runtime
only for authenticated CMS draft previews and small, isolated endpoints whose
separate research tickets justify them (for example, a contact-form relay).
Published CMS changes should trigger a new atomic build through a deploy hook.

Do **not** configure Next.js as a pure `output: "export"` site. Static export is
portable, but Next.js explicitly excludes Draft Mode, ISR, redirects, headers,
Server Actions, and other server features from that mode. A normal Next.js build
can still pre-render the public pages while preserving the narrow runtime needed
for preview and integrations. [Next.js static export guide](https://nextjs.org/docs/app/guides/static-exports)

Cloudflare Workers is the zero-cost-first host because requests for static
assets are free and unlimited, it supplies a free `workers.dev` URL, it supports
custom domains later, and its Git integration can create per-branch preview
deployments. Cloudflare documents support through OpenNext for App Router, SSG,
SSR, ISR, Route Handlers, React Server Components, Server Actions, and response
streaming. [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
[Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
[Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)

This recommendation has a deterministic fallback: if the completed application
cannot satisfy the Workers Free runtime limits in the release checks below,
deploy the same Next.js application to **Netlify Free**. If Netlify's monthly
credit envelope later proves too small, the first paid fallback is Cloudflare
Workers Paid, currently a $5/month minimum. This fallback order preserves the
cost priority without reopening the architecture decision.

## Application architecture

### Route and rendering model

Use a persistent App Router layout under `app/[lang]/layout.tsx`, with one route
per main view and one dynamic project route:

```text
/[lang]/about
/[lang]/experience
/[lang]/education
/[lang]/skills
/[lang]/projects
/[lang]/projects/[slug]
/[lang]/contact
```

Generate `en` and `hr` from the locale layout and generate every published
project slug for both locales. Next.js documents locale segments and
`generateStaticParams` specifically for statically rendering locale routes;
the same API enumerates dynamic project paths during `next build`.
[Next.js internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
[Next.js `generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

The public path should be:

1. A build fetches only published CMS content.
2. All known locale and project paths are emitted as static output.
3. The TUI shell uses Server Components by default.
4. Only interactive controls—navigation state, theme preference, media
   lightboxes, and similarly local behavior—become Client Components.
5. A CMS publish webhook calls a protected Cloudflare Deploy Hook and produces
   a new deployment. Cloudflare lists headless-CMS rebuilds as a deploy-hook use
   case. [Cloudflare Deploy Hooks](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/)

This provides real HTML for direct links and search indexing without turning
every portfolio visit into a server invocation.

### Draft preview

Use Next.js Draft Mode behind a secret-bearing Route Handler:

- validate a CMS-supplied, time-limited token before enabling preview;
- set the Draft Mode cookie only after validation;
- fetch draft content only while the cookie is present;
- keep preview URLs out of the sitemap and add `noindex`;
- never expose the CMS read token to a Client Component.

Next.js Draft Mode switches a statically rendered page to request-time rendering
and is enabled from a Route Handler by setting a build-specific bypass cookie.
[Next.js `draftMode`](https://nextjs.org/docs/app/api-reference/functions/draft-mode)

The public site remains static; only the owner uses this dynamic path. The exact
CMS token exchange belongs to the CMS-selection decision, but the architecture
does not depend on a particular CMS vendor.

### Isolated integrations

Each non-page integration should be a small Route Handler with Web-standard
`Request`/`Response` boundaries. Core content must not live in Cloudflare KV,
D1, Vercel storage, or another host-specific database. Keep:

- CMS access behind a `ContentRepository` adapter;
- mail delivery behind a `ContactDelivery` adapter;
- analytics behind an optional client/server adapter;
- provider configuration limited to deployment files and a `platform` module.

Avoid relying on provider middleware for ordinary locale routing; explicit
`/[lang]` routes are clearer and more portable. Cloudflare currently notes that
Node.js middleware is not supported by its OpenNext adapter, despite supporting
the ordinary Next.js middleware path. [Cloudflare Next.js feature matrix](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/#nextjs-supported-features)

Next.js remains movable: it documents Node.js server, Docker, static export, and
adapter deployment targets. Node and Docker support all framework features, and
the public Adapter API gives other platforms a defined integration surface.
[Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying)
[Next.js deployment adapters](https://nextjs.org/docs/app/guides/deploying-to-platforms)

## Framework comparison

| Option | Fit | Decision-relevant trade-off |
| --- | --- | --- |
| **Next.js App Router** | **Best** | Built-in file routing, static generation for locale/project paths, metadata conventions, Server/Client Component boundaries, and Draft Mode cover the requirements with the least custom infrastructure. It remains deployable as Node, Docker, static output, or through adapters. |
| React Router Framework Mode | Good runner-up | It can pre-render enumerated dynamic routes with or without a runtime server, and its server build can run on many JavaScript hosts. It is more portable at the server boundary, but CMS draft preview, metadata/image conventions, and authenticated preview behavior would be more application-owned. [React Router pre-rendering](https://reactrouter.com/how-to/pre-rendering) [React Router deployment model](https://reactrouter.com/start/framework/deploying) |
| Vite + React SPA | Reject | It is simple and portable, but a client-only fallback is a weaker default for localized indexable pages, project-specific metadata, first-load performance, and CMS preview. Reconstructing prerendering and server endpoints would amount to assembling a framework. |
| Astro with React islands | Reject for this brief | It is strong for static content and low JavaScript, and it integrates with headless CMS products, but it makes React an island renderer rather than the site's primary application framework. That adds a second component/runtime model for a deliberately application-like TUI shell. [Astro CMS guide](https://docs.astro.build/en/guides/cms/) |

## Hosting comparison

### 1. Cloudflare Workers Free — selected

Relevant first-party facts:

- Cloudflare's OpenNext adapter supports the Next.js features this architecture
  needs, including SSG, SSR, ISR, and Route Handlers.
- Static asset requests are free and unlimited.
- The free dynamic allowance is 100,000 requests/day, with 10 ms CPU time per
  invocation, 128 MB memory, a 3 MB compressed Worker, 20,000 static files, and
  25 MiB per static file.
- Cloudflare notes that authentication and server-side rendering commonly use
  10–20 ms CPU, so the 10 ms free cap is a real constraint rather than a
  theoretical footnote.
- Workers Builds supports production and non-production branches, versioned and
  aliased preview URLs, GitHub pull-request comments, and a `workers.dev`
  production URL.
- A custom domain can replace the free URL later.

Sources:
[Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
[Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
[Cloudflare preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
[Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

The public site avoids these dynamic limits because it is pre-rendered. Draft
preview and optional integrations are low-volume, but they still need the
release checks below.

### 2. Netlify Free — automatic no-cost fallback

Netlify fully supports Next.js App Router, SSG, SSR, ISR, Route Handlers, and
Server Actions through its adapter. Its free plan includes custom domains,
serverless functions, SSL, and unlimited deploy previews, with a hard monthly
limit of 300 credits and no automatic recharge.
[Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
[Netlify credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)

The trade-off is material for a CMS-backed portfolio: a production deployment
costs 15 credits, 1 GB of delivered bandwidth costs 20, 10,000 web requests cost
2, and 1 GB-hour of function compute costs 10. Twenty content publishes alone
would consume the monthly free allowance before traffic. The hard limit
prevents surprise charges but can pause availability, so Netlify is the fallback
rather than the first choice.

### 3. Vercel Hobby — technically strongest, eligibility not assumed

Vercel offers the deepest Next.js integration: Git-triggered preview
deployments, `vercel.app` URLs, later custom domains, substantial function
allowances, and protected Draft Mode integrated with preview deployments.
[Vercel plans](https://vercel.com/docs/plans)
[Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
[Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

The Hobby plan is restricted to personal, non-commercial use. Vercel defines
commercial usage broadly as deployment for financial gain and tells uncertain
users to contact support. Because this portfolio exists to help secure paid
employment, the map should not silently assume eligibility. Use Vercel Hobby
only if Vercel gives written confirmation that this specific use is eligible;
otherwise its next tier starts at $20/month, which violates the cost priority.
[Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
[Vercel Pro plan](https://vercel.com/docs/plans/pro-plan)

### 4. GitHub Pages — static contingency only

GitHub Pages is free for public repositories, supports HTTPS and later custom
domains, and can publish a custom static build through GitHub Actions. It is a
static hosting service and does not provide the runtime needed for secure CMS
Draft Mode or isolated serverless integrations. Its soft limits include 100 GB
bandwidth/month and 10 builds/hour, and sites may be at most 1 GB.
[GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
[GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)

It remains an escape hatch only if the product later drops runtime draft preview
and all on-site server integrations.

## Release checks and fallback rule

The implementation must pass these checks before Cloudflare becomes production:

1. `wrangler deploy --dry-run` reports a compressed Worker no larger than 3 MB
   and no more than 20,000 static files.
2. Every published `en` and `hr` main route and project route appears in the
   generated static assets and can be requested without invoking dynamic code.
3. Draft preview is tested in the `workerd`-based Cloudflare preview environment,
   not only in `next dev`.
4. Cloudflare production telemetry shows draft-preview and any chosen
   integration handler do not consistently exceed the 10 ms CPU limit.
5. A CMS publish webhook successfully triggers an atomic build, and a failed
   build leaves the previous production deployment live.
6. A non-production Git branch produces a stable preview URL without promoting
   it to production.

If check 1 or 3–4 fails, deploy unchanged application code to Netlify Free. If
Netlify consumption reaches 70% of its monthly credits in normal operation for
two consecutive months, move to Cloudflare Workers Paid at the next release,
with a configured CPU limit and usage alerts. This is a hosting change, not an
application rewrite.

## Consequences

- Public portfolio visits are fast, indexable, and normally cost no compute.
- English and Croatian pages and project details have canonical shareable URLs.
- The CMS can preview drafts without making unpublished content public.
- Contact and analytics decisions can add narrow server behavior without
  converting the whole site to request-time rendering.
- The free host has explicit technical limits, but the architecture contains
  their impact and defines a no-cost fallback.
- Component-library selection remains independent: Next.js renders ordinary
  React components, so the separate component-foundation ticket can choose
  shadcn/ui, Radix-based primitives, or another suitable library without
  revisiting this decision.
