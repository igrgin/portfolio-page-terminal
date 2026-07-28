# Privacy-friendly portfolio analytics

**Status:** Decision research  
**Decision:** Defer analytics from v1  
**Reviewed:** 28 July 2026  
**Governing decision:** [Portfolio privacy and compliance baseline](https://github.com/igrgin/portfolio-page-terminal/blob/06bf61d2ddc1cf9d70a9cb07708d02af856842c8/docs/research/privacy-compliance-baseline.md)

> This is product and technical research, not professional legal advice. The legal observations below identify release risks and the additional conclusion that would be needed before deployment; they are not a definitive interpretation of Croatian or EU law.

## Question

Can the portfolio measure visits, referrals, and popular projects through a free, privacy-friendly, cookie-free analytics approach with negligible performance impact and a defensible no-banner Croatian/EU posture?

## Decision

Launch **without analytics**.

The reviewed free hosted products can provide the desired dashboard, but none passes the governing baseline as currently documented:

- Vercel Web Analytics and Umami identify a visitor or session from request and device data.
- Cloudflare Web Analytics avoids cookies, local storage, and fingerprinting, but still runs a browser beacon that reads browser-held information and sends analytics events.
- GoatCounter's default aggregate storage is unusually restrained, but its hosted service transiently combines IP address and user agent to recognise an eight-hour session, uses a browser-side collector for complete referral data, and does not expose a sufficient Article 28 contracting path in the official materials reviewed.
- A custom server-side aggregate counter could avoid visitor identity and browser analytics code, but it would not measure distinct people, would miss client-only React route transitions, depends on the hosting choice, and adds bespoke infrastructure for an optional feature.

“Cookie-free” therefore does not settle the Croatian ePrivacy question, and a vendor's statement that its output is anonymous does not by itself document every collection and transformation phase. Adding a consent banner merely to count a low-traffic portfolio's visits would contradict the privacy-minimal product direction.

The v1 privacy notices should say that analytics is disabled. Hosting/security logs remain a separate operational activity governed by the privacy baseline; they must not be repurposed into visitor analytics without a new review.

## Governing release gate

The baseline permits future analytics only if all of these conditions pass:

1. no cookies, browser storage, fingerprinting, stable or rotating visitor IDs, profiles, replay, or return-visitor recognition;
2. no browser-side third-party analytics request, with server-side aggregation preferred;
3. no persistent raw IP address and no precise location;
4. aggregate-only output, not an individual visitor timeline;
5. raw event detail deleted within 24 hours where possible and no later than 30 days; non-identifying aggregates retained no longer than 13 months;
6. no advertising, sale, cross-customer reuse, enrichment, or model training;
7. a documented GDPR lawful basis and accurate privacy notice;
8. a documented Croatian Electronic Communications Act Article 43 conclusion for the exact implementation;
9. an Article 28 DPA, known subprocessors and locations, acceptable retention/deletion, and a documented Chapter V transfer path;
10. omission if the no-consent conclusion remains materially uncertain.

This is stricter than a “no cookies” marketing claim. Croatia's Article 43 rule covers storage in or access to terminal equipment and exempts only transmission or storage/access necessary for a service explicitly requested by the user ([Croatian Electronic Communications Act, Article 43](https://narodne-novine.nn.hr/clanci/sluzbeni/2022_07_76_1116.html)). The EDPB explains that Article 5(3) of the ePrivacy Directive can cover JavaScript-instructed requests, tracking pixels, fingerprinting, URL identifiers, and some IP-only tracking, while exemptions depend on the national implementation and the concrete use ([EDPB Guidelines 2/2023](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)).

Separately, if a provider processes personal data on the portfolio owner's behalf, GDPR Article 28 requires a binding processor contract with specified safeguards; transfers outside the EEA must satisfy Chapter V rather than relying on a privacy label alone ([GDPR Articles 28 and 44–46](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). These GDPR duties and the Croatian terminal-access rule are distinct checks.

## What the desired metrics require

| Desired answer | Minimum data | Privacy consequence |
| --- | --- | --- |
| “Is anyone reaching the site?” | A count of document requests or page-view events | Can be aggregate-only; it does not need a visitor identifier. Bots, reloads, and prefetches make it approximate. |
| “Which projects are popular?” | A route/path attached to each count | A server can count full document requests. A client-routed React transition needs a browser event unless navigation causes a new document request. |
| “Where did visitors come from?” | The HTTP `Referer` header or `document.referrer` | Store only an allowlisted external hostname/category. Full referrer URLs can contain paths, searches, or identifiers and should not be retained. |
| “How many distinct visits?” | A rule for correlating requests into a person or session | Typical free tools derive a temporary ID from IP address and user-agent/browser data. That conflicts with the baseline's no-device-recognition rule. |

For this portfolio, page/request counts are sufficient to answer the useful product question. A “unique visitor” number is neither necessary nor accurate enough to justify recognition of a device or network endpoint.

## Candidate review

### Vercel Web Analytics

**Technical facts**

- It provides visitors, page views, top pages, and referrers. It identifies visitors with a hash made from the incoming request; the generated hash lasts for one day, and visitor sessions are discarded after 24 hours ([Vercel Web Analytics](https://vercel.com/docs/analytics), [privacy documentation](https://vercel.com/docs/analytics/privacy-policy)).
- Its client-side script transmits page views and client-side route changes. Stored data points may include time, URL/path, filtered query parameters, referrer, geolocation, operating system, browser, and device type ([privacy documentation](https://vercel.com/docs/analytics/privacy-policy)).
- The Hobby plan includes 50,000 events per month and pauses collection rather than charging after the allowance. Its reporting window is one month, but Vercel says it may retain data longer to support a later upgrade. Custom events and UTM parameters are not included on Hobby ([limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing)).

**Contract and transfer facts**

- Vercel's current DPA says it applies to Enterprise and Pro customers, not Hobby customers. It also states that primary processing facilities are in the United States and allows processing wherever Vercel or its subprocessors operate, with SCCs or another transfer mechanism used as applicable ([Vercel DPA](https://vercel.com/legal/dpa)).

**Assessment**

It meets the functional and zero-price requirements at expected traffic, but fails the baseline. A daily request-derived visitor hash is a rotating visitor identifier; browser-side collection is required; the free plan lacks the documented DPA coverage required by the baseline; and the provider does not promise deletion at the end of the one-month reporting window. Vercel's statement that stored data points are anonymous is a technical/provider claim, not a Croatian Article 43 no-consent conclusion.

### Cloudflare Web Analytics

**Technical facts**

- It is free. It uses a JavaScript beacon loaded from `static.cloudflareinsights.com`, reads the Navigation Timing/Performance APIs, and sends data to a Cloudflare RUM endpoint. For a single-page app it sends a measurement on every route change ([overview](https://developers.cloudflare.com/web-analytics/about/), [data collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/), [FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- Cloudflare states that it uses no cookies, local storage, or fingerprinting. Its privacy-oriented “visit” is not a unique person: it is a successful page view whose referrer does not match the requested host, so it avoids maintaining user state ([Cloudflare GDPR FAQ](https://www.cloudflare.com/trust-hub/gdpr/), [original visit definition](https://blog.cloudflare.com/free-privacy-first-analytics-for-a-better-web/)).
- It exposes paths and external referrers, together with country, browser, operating system, and device dimensions. Unsampled beacon rows are retained for seven days, older data is sampled/aggregated, and the dashboard exposes six months ([dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/), [FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- For proxied sites, Cloudflare can exclude EU visitors from beacon injection. Cloudflare's free edge analytics does not provide the per-URL server-side breakdown required to identify popular projects; advanced server-side URL analytics is paid ([setup](https://developers.cloudflare.com/web-analytics/get-started/), [FAQ](https://developers.cloudflare.com/web-analytics/faq/)).

**Contract and transfer facts**

- Cloudflare's Self-Serve Subscription Agreement incorporates its DPA when customer content includes covered personal data, including for free services ([Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/), [current DPA](https://cf-assets.www.cloudflare.com/slt3lc6tev37/1TTgT35GoUNlKZYGuKWBFy/4e7dfc8cf402419a9b1cf624291fc69f/cloudflare_customer_dpa-v6.4_april_3_2026.pdf)).
- Cloudflare says relevant metadata is processed in the United States and Europe. Its customer-metadata geographic boundary is part of an Enterprise-only paid data-localization add-on; its published subprocessor list includes Cloudflare Developer Platform processing in the EEA, United States, Australia, and India ([GDPR FAQ](https://www.cloudflare.com/trust-hub/gdpr/), [Data Localization Suite](https://developers.cloudflare.com/data-localization/), [subprocessors](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/)).

**Assessment**

This is the closest off-the-shelf candidate because it avoids identifying a person and its self-serve contract includes a DPA. It still fails the present release gate: it is browser analytics, loads code from a Cloudflare hostname, reads browser-held timing/navigation information, and sends an event for every SPA route. Those facts require an exact Croatian Article 43 analysis; Cloudflare's privacy claim does not supply that national-law conclusion. Excluding EU beacon injection would also make the portfolio's measurements incomplete and does not document the operator's GDPR position for the remaining processing.

### GoatCounter hosted

**Technical facts**

- The hosted service is donation-supported and free for reasonable public use; its script is approximately 3.5 KB and supplies page, referrer, and popular-content statistics ([terms](https://www.goatcounter.com/help/terms), [product page](https://www.goatcounter.com/)).
- By default it stores separate aggregate tables rather than individual page views. It does not store raw IP addresses or full user-agent strings on disk and uses no cookie, local storage, or browser tracker ID. To avoid recounting the same visit, however, it holds `site + IP + User-Agent` in memory for up to eight hours and maps that to a random session ID ([privacy documentation](https://www.goatcounter.com/help/privacy), [sessions](https://www.goatcounter.com/help/sessions)).
- Hosted data is on Hetzner servers in Finland and Germany; the operator is in Ireland. Account deletion removes live data, while backups may remain for up to 30 days ([privacy documentation](https://www.goatcounter.com/help/privacy)).
- Complete page and referrer collection uses a browser script. Its JavaScript defaults read the page path (including search parameters), title, and `document.referrer`; a non-JavaScript pixel loses referrer and screen data ([JavaScript collector](https://www.goatcounter.com/help/js), [pixel](https://www.goatcounter.com/help/pixel)).

**Contract assessment**

The official terms, privacy documentation, and GDPR explanation reviewed do not provide an Article 28 DPA, subprocessor-change process, security/incident commitments, or a clear way for a free user to bind the operator to processor terms. This is a documentation gap, not a claim that no private arrangement could be obtained.

**Assessment**

GoatCounter is technically restrained, but session recognition uses IP and user agent transiently, and full referral collection runs in the browser. Disabling sessions would give up distinct visits, while using the pixel would give up referrals. Until a sufficient processor contract is available and Croatian Article 43 is resolved for the browser collection, it fails the governing provider and no-banner gates.

### Umami Cloud Hobby

**Technical facts**

- The Hobby plan is free, and Umami's tracker is under 2 KB. The hosted service offers page views, visitors, visits, paths, and referrers ([Cloud FAQ](https://docs.umami.is/docs/cloud/faq), [product documentation](https://docs.umami.is/docs)).
- A session is a stored UUID derived from a hash of information including website ID, hostname, user agent, and a rotating monthly salt. Visits use that session ID and an hourly rotating salt. The request IP is used for location, though Umami says it is not stored ([metric definitions](https://docs.umami.is/docs/metric-definitions), [sessions](https://docs.umami.is/docs/sessions)).
- Umami stores per-event UUIDs and exposes individual session activity, while the browser tracker sends path/search, referrer, title, language, and screen information ([metric definitions](https://docs.umami.is/docs/metric-definitions), [collection setup](https://docs.umami.is/docs/collect-data)).
- Umami says Cloud data is hosted in US and EU regions and publishes a DPA template ([Cloud FAQ](https://docs.umami.is/docs/cloud/faq), [DPA](https://umami.is/umami-dpa.pdf)).

**Assessment**

It fails the baseline regardless of its cookie-free design: it recognises a visitor with a rotating request/device-derived identifier, keeps individual event/session records, supports per-session histories, and uses browser-side tracking. The reviewed public documentation also does not establish Hobby retention limits or demonstrate that the blank DPA template is automatically incorporated into a Hobby subscription.

## Server-side aggregate alternative

A narrow custom counter can technically satisfy more of the baseline than the hosted dashboards:

1. execute only when the host serves a requested HTML document;
2. allowlist public localized routes and map project slugs to non-personal content IDs;
3. discard query strings and fragments;
4. reduce an external referrer immediately to an allowlisted hostname/category and discard internal referrers;
5. never read or store IP address, user agent, location, language, device data, cookies, or browser storage;
6. increment only daily aggregate rows such as `{date, route, referrerCategory, count}`;
7. expose only totals and delete aggregates after 13 months;
8. label the result “page requests,” not people, visitors, or unique visits.

For example, Cloudflare Durable Objects can hold strongly consistent aggregate counters and are available on the Workers Free plan. The current free limits include 100,000 Durable Object requests and 100,000 stored-row writes per day with 5 GB of SQLite-backed storage, far beyond expected portfolio traffic ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Cloudflare Workers Analytics Engine is also free within 100,000 writes and 10,000 queries per day, but fixes retention at three months and stores a data point for each request, so it is a worse fit for the baseline's aggregate-only, short-detail-retention design ([Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/), [retention limit](https://developers.cloudflare.com/analytics/analytics-engine/limits/)).

This route is **not approved for v1**:

- The hosting/platform decision has not been made, so adopting it now would improperly constrain that decision.
- Server-side counting sees only document requests. Client-side React navigation between already-loaded routes requires a browser event, while forcing full document navigation would let optional analytics influence the site's architecture.
- A page request is not a human visit; bot filtering or deduplication usually inspects additional request/device signals.
- The Cloudflare transfer assessment and exact processor configuration still need to pass the provider gate.
- “No added browser access” is a strong technical fact, but a documented lawful-basis and Croatian legal conclusion would still be required.
- The extra Worker/storage path needs a latency and failure-isolation prototype before “negligible performance impact” can be claimed.

## Technical findings versus legal conclusions

### Established technical findings

- A useful count of page requests, popular routes, and coarse referrer hosts does not require identifying a person.
- Distinct visit/session metrics in Vercel, GoatCounter, and Umami are produced by correlating request/device attributes, even though none needs a cookie.
- Cloudflare Web Analytics avoids that correlation, but it still executes browser code and sends analytics beacons.
- A pure server-side counter cannot see client-only route changes.
- All reviewed hosted tools add a collection script or pixel for complete SPA/referrer measurement; server-side custom aggregation instead adds edge compute/storage.
- The free products differ materially in DPA coverage, data locations, retention, and what “visit” means.

### Legal conclusions not established by vendor documentation

- That a cookie-free browser beacon is exempt from Croatian Article 43 consent.
- That a transient IP/user-agent hash or in-memory session key is outside GDPR merely because the stored dashboard output is aggregated.
- That a provider's “anonymous” or “GDPR compliant” statement eliminates the controller's lawful-basis, transparency, processor, and transfer duties.
- That processing outside the EEA is acceptable merely because SCCs or a DPA are published; the exact transfer path and supplementary safeguards still need review.
- That first-party server request aggregation is definitively outside Article 43 in the intended configuration.

## Reconsideration path

Reopen analytics only after hosting and routing are fixed, and only if one of these paths becomes concrete:

1. **Host-native, server-side, aggregate-only reporting** becomes available on the selected free plan with route and coarse referrer counts, no visitor/session identity, a satisfactory DPA/transfer review, and controllable retention; or
2. a small server-side aggregation prototype meets the data-minimisation rules above, does not affect client navigation, fails open without delaying content, and obtains a documented Croatian Article 43 and GDPR basis conclusion.

Do not reconsider merely because a service advertises “cookie-free,” “anonymous,” or “GDPR compliant.” If the implementation still needs browser analytics code, hashes request/device attributes into a session, or cannot meet the processor/transfer gate, analytics stays disabled.

## V1 implementation consequences

- Do not install Vercel Analytics, Cloudflare Web Analytics, GoatCounter, Umami, Google Analytics, pixels, session replay, heatmaps, or custom event tracking.
- Do not add analytics CSP allowances or analytics environment variables.
- Keep the React routing and hosting choices independent of analytics.
- Do not expose hosting logs to the CMS or use them to build a visitor dashboard.
- State in both language versions of the privacy notice that no visitor analytics is enabled; document only the host's necessary delivery/security logs.
- Add a release test that asserts there are no analytics scripts, pixels, beacons, or unexpected third-party browser requests.
