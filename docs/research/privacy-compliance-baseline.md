# Portfolio privacy and compliance baseline

**Status:** Decision baseline for implementation  
**Jurisdictional baseline:** Croatia and the European Union / EEA  
**Reviewed:** 28 July 2026

> This is product and technical research, not professional legal advice. It deliberately chooses a conservative, low-data implementation. A lawyer or the competent authority should be consulted before introducing behavioural tracking, advertising, user accounts, marketing communications, payments, or materially different processing.

## Decision

The portfolio can launch with a contact form without taking on disproportionate privacy risk, provided that it follows the contact-form controls below and the selected hosting, form, email, and CMS providers pass the processor and transfer gate.

Launch **without analytics**. “Cookie-free” is not a sufficient compliance test: analytics can still process IP addresses or online identifiers, and ePrivacy rules cover technologies beyond cookies. Analytics may be added later only if the exact product and configuration pass the analytics gate below. If a no-consent conclusion cannot be documented with confidence for Croatia, omit analytics rather than add a consent banner merely to count visits.

The public site should otherwise be privacy-minimal: no advertising, profiling, marketing pixels, social widgets, remotely hosted fonts, third-party media embeds, or browser-to-GitHub content requests. Theme and language preferences may be saved locally as narrowly scoped, user-requested functional settings.

## Why this baseline applies

The prudent implementation assumption is that GDPR applies. The site operator is in Croatia, the portfolio is professional and public rather than purely domestic, and the site will process visitor information through hosting logs and, if enabled, contact submissions. GDPR applies to processing in the context of an EU establishment regardless of where the processing takes place ([GDPR Article 3(1)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). CJEU case law also construes the personal/household exception narrowly where activity is directed outwards or information is made available to an unrestricted public ([C-25/17, paragraphs 41–42](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A62017CJ0025)).

Croatia’s GDPR implementation act identifies the Croatian Personal Data Protection Agency (AZOP) as the independent supervisory authority ([Zakon o provedbi Opće uredbe o zaštiti podataka, Articles 1 and 4](https://narodne-novine.nn.hr/clanci/sluzbeni/2018_05_42_805.html)). Croatian ePrivacy rules are implemented through the Electronic Communications Act. Its Article 43(4) requires consent and clear information for storage in or access to a user’s terminal equipment, except where storage/access is solely for transmitting a communication or is necessary for an information-society service explicitly requested by the user ([Zakon o elektroničkim komunikacijama, Article 43](https://narodne-novine.nn.hr/clanci/sluzbeni/2022_07_76_1116.html)). HAKOM lists the current act as NN 76/22, as amended by NN 14/24 and NN 45/26 ([HAKOM legislation index](https://www.hakom.hr/hr/zakoni-2038/2038)).

Worldwide accessibility does not make every visit a GDPR “international transfer” by itself. The CJEU has held that putting information on an EU-hosted web page that can be viewed worldwide is not, for that reason alone, a transfer to every third country ([C-101/01, Lindqvist](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A62001CJ0101)). Actual routing, storage, support access, or onward processing by a provider outside the EEA is different and must pass the transfer gate.

This is an EU/Croatian baseline, not a conclusion that the site complies with every law worldwide. Reassess the relevant jurisdictions if the site begins targeting paid services in another country, reaches material statutory thresholds, or adds accounts, advertising, tracking, payments, uploads, newsletters, or child-directed content.

## Governing principles

Every processing purpose must satisfy the GDPR principles of lawfulness, transparency, purpose limitation, minimisation, storage limitation, security, and demonstrable accountability ([GDPR Article 5](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). Privacy by design and default requires the site to collect, retain, and expose only what is necessary for each purpose ([GDPR Article 25](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)).

Maintain a short internal data inventory even if a formal Article 30 record might not be required. For each service, record:

- purpose and categories of data;
- legal basis;
- whether the provider is a processor, joint controller, or independent controller for each purpose;
- recipients, subprocessors, processing locations, and transfer mechanism;
- retention and deletion behaviour;
- security controls and incident contact;
- the date, configuration, and contract/DPA version reviewed.

That one-page inventory is the operational source for the privacy notice and future reviews.

## Launch data map

| Activity | Data | Proposed basis and controls | Default retention |
| --- | --- | --- | --- |
| Static hosting and security | IP address, request time, requested path, user agent, and operational/security metadata the host necessarily records | Legitimate interests in delivering and securing the site, after a documented necessity and balancing assessment; choose the least-logging configuration | Shortest provider-supported period; target no more than 30 days unless a specific incident requires preservation |
| Theme and language preference | Theme (`light`, `dark`, or system) and locale (`en` or `hr`) in first-party browser storage | Necessary to remember a setting explicitly chosen by the visitor; never send the preference to an analytics service | Until the visitor changes it or clears browser storage |
| Contact form | Name, reply email, message, submission time; transient abuse-control data if needed | Legitimate interests for ordinary enquiries; Article 6(1)(b) only when a message genuinely requests pre-contractual steps | Relay/queue copy deleted on delivery, target within 7 days; mailbox copy deleted 6 months after the last meaningful exchange unless moved to a separate active or legally required record |
| Direct email | Sender address, message, and mail metadata | Same purpose-specific basis and retention as the contact form | 6 months after the last meaningful exchange unless moved to a separate active or legally required record |
| Abuse prevention | Prefer honeypot and request rate; IP only if necessary | Legitimate interests in service security; do not reuse for analytics or profiling | In-memory or shortest practical TTL; target no more than 24 hours |
| Analytics | None at launch | Not applicable | Not applicable |

The retention periods above are implementation choices, not statutory safe harbours. GDPR requires a period tied to necessity rather than prescribing a universal number ([GDPR Article 5(1)(e)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). Spam should be deleted promptly. If a contact becomes part of an actual recruitment, employment, or contractual process, move it to the appropriate separate record and retention rule instead of silently retaining every enquiry.

## Contact-form requirements

### Data and user experience

- Require only **name, reply email, and message**. Do not require a phone number, employer, location, account, résumé, attachment, or marketing opt-in.
- Add reasonable length limits and ask visitors not to send special-category, confidential, or unnecessary personal data.
- Put a short just-in-time notice next to the submit action, linking to the full English or Croatian privacy notice.
- Do **not** use a consent checkbox for the processing necessary to receive and answer the message. Consent is one legal basis, not a universal formality; where legitimate interests is used, document the legitimate purpose, necessity, reasonable expectations, impact, safeguards, and right to object. The EDPB describes these as three cumulative conditions: a real lawful interest, necessary processing, and a balancing exercise ([EDPB guidance announcement](https://www.edpb.europa.eu/news/news/2024/edpb-adopts-opinion-processors-guidelines-legitimate-interest-statement-draft_en)).
- Use Article 6(1)(b) only where the sender is actually asking the operator to take steps toward a contract. Do not label every general message “contractual.”
- Never add senders to a mailing list or reuse their details for marketing, model training, analytics, or contact enrichment.
- Forward submissions directly to the owner’s mailbox. Avoid a second durable form database. Ensure application and function logs never contain form bodies or email addresses.

### Spam protection

Start with a hidden honeypot, server-side validation, bounded message sizes, rate limiting, and provider abuse controls. A third-party CAPTCHA is not approved by this baseline: it introduces an additional recipient and may involve device access, cookies, telemetry, or international transfers. It can be considered only if abuse makes the first-party measures inadequate and its exact data flow passes the provider and ePrivacy gates.

### Lawful-basis record

Before launch, write a short legitimate-interests assessment for:

1. receiving and replying to voluntary professional enquiries;
2. retaining limited correspondence long enough to manage follow-up;
3. proportionate security logging and abuse prevention.

Article 6(1)(f) permits necessary processing for legitimate interests only where the visitor’s interests or fundamental rights do not override them, and Recital 47 requires attention to the visitor’s reasonable expectations ([GDPR Article 6 and Recital 47](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). The minimalist fields, short retention, no reuse, and direct user initiation make that basis plausible, but this is a documented assessment rather than an automatic rule.

## Analytics and ePrivacy gate

### Why “cookie-free” does not settle consent

The Croatian rule concerns storage in or access to terminal equipment, not only files named cookies. AZOP states that consent is normally required for storing or reading terminal information and that only technically necessary uses are exempt; its examples include a user’s language selection as an exempt input preference ([AZOP cookie guidance](https://azop.hr/obrada-osobnih-podataka-putem-kolacica-eng-cookies/)).

The EDPB’s final technical guidance says Article 5(3) covers information more broadly than personal data and can apply to JavaScript-instructed requests, tracking pixels, fingerprinting, URL identifiers, and, in some circumstances, IP-only tracking. It also says exemptions must be assessed case by case under national implementation and guidance ([EDPB Guidelines 2/2023](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)). Dynamic IP addresses can also be personal data for a website operator that has legal means reasonably enabling identification with additional provider data ([CJEU C-582/14, Breyer](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A62014CJ0582)).

Therefore, a provider’s “no cookies” claim does not establish that:

- it performs no terminal access;
- it processes no personal data;
- no ePrivacy consent is required in Croatia; or
- GDPR transparency and lawful-basis duties disappear.

### Approval criteria for future analytics

Analytics remains optional and may be enabled only after a product-specific review confirms all of the following:

1. **No user or device tracking:** no cookies, local/session storage, fingerprinting, stable or rotating visitor IDs, cross-site tracking, replay, profiles, or attempts to recognise a returning visitor.
2. **No browser-side third-party request:** prefer first-party, server-side aggregation. Verify the shipped code and network traffic, not only marketing material.
3. **IP minimisation:** do not persist raw IP addresses; strip or irreversibly aggregate them at the earliest controlled point. Do not derive precise location.
4. **Aggregate-only output:** page/path counts and coarse referrer/source categories are sufficient. No visitor timeline or per-person drill-down.
5. **Short detail retention:** target deletion of raw event detail within 24 hours and no later than 30 days; keep only non-identifying aggregates for up to 13 months.
6. **No reuse:** no advertising, sale, benchmarking across customers, product training, or provider enrichment using portfolio visitor data.
7. **GDPR basis and notice:** document a legitimate-interests assessment for any personal-data phase and describe the processing in the privacy notice.
8. **ePrivacy conclusion:** document why no terminal storage/access occurs or why a specific Croatian Article 43 exemption applies. “Cookie-free” alone fails this criterion.
9. **Provider and transfer gate:** the analytics provider satisfies every requirement in the next section.
10. **No-banner release gate:** if competent Croatian guidance or the concrete implementation leaves material doubt about whether prior consent is required, do not deploy analytics under the requested banner-free model.

There is genuine legal uncertainty at the boundary between ordinary network delivery/server logs and IP-based audience measurement. The EDPB expressly leaves consent exemptions to case-by-case national analysis. For a nonessential portfolio metric, omission is the proportionate answer when that uncertainty cannot be resolved.

## Theme and locale storage

On the first visit, use browser/system signals without persisting a value. Store a theme or language value only after the visitor chooses it. Keep it first-party, limited to the selected value, and do not expose it to other services.

AZOP expressly identifies user-input language-selection cookies among uses that may not require consent. Treat the theme choice by analogy as a functional preference needed to honour the visitor’s explicit request. This is an implementation inference, not an AZOP ruling specifically about theme toggles. Disclose both preferences as essential local storage in the privacy notice. On this narrow configuration, a cookie banner is not warranted.

## Provider, processor, and transfer gate

Before adopting hosting, form delivery, email, CMS, spam protection, or analytics, verify from the provider’s then-current official terms and technical documentation:

- the provider’s role for each purpose, including any independent security, fraud, telemetry, or product-improvement purposes;
- an Article 28 data processing agreement with confidentiality, security, deletion/return, assistance with rights and incidents, audit information, and controlled subprocessors;
- a current subprocessor list and change-notice mechanism;
- processing, support, backup, and log locations—not only the advertised primary data region;
- configurable retention and reliable deletion;
- export and deletion support for data-subject requests;
- incident-notification commitments that leave enough time for the controller to assess the GDPR deadline;
- prohibition or opt-out for advertising, cross-customer tracking, AI/model training, and unrelated product analytics.

GDPR requires processors that provide sufficient guarantees and a binding contract containing the Article 28 terms ([GDPR Article 28](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)).

Prefer EEA processing and EEA support access. If personal data is transferred outside the EEA, document the exact transfer path and use an applicable adequacy decision or Article 46 safeguards. Standard contractual clauses may require a transfer impact assessment and supplementary safeguards; a provider merely offering SCCs does not finish that analysis ([European Commission SCC Q&A](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en), [GDPR Articles 44–46](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)).

Do not hotlink project images, diagrams, avatars, badges, fonts, or Markdown assets from GitHub or another third party. Fetch approved repository content during build/publish and serve a local copy from the portfolio origin. Ordinary external links to GitHub and LinkedIn are preferable to embedded widgets because the third party receives visitor data only after an intentional click.

## Public privacy notice

Publish equivalent, plain-language notices at stable `/en/privacy` and `/hr/privatnost` routes, link them in the global footer and beside the contact submit action, and record the effective date. GDPR Article 13 requires the information when data is collected, including identity/contact, purpose and basis, legitimate interests, recipients, transfers, retention, rights, complaint, required/optional data, and automated decision-making ([GDPR Article 13](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). AZOP likewise instructs controllers to make privacy information clear and publicly accessible ([AZOP guidance for controllers](https://azop.hr/prava-ispitanika-obveze-voditelja-obrade/)).

The notice must state the actual configuration, not a generic template. Include:

1. Ivo Grgin as controller and a dedicated privacy contact email;
2. separate rows or sections for hosting/security logs, local preferences, contact form/direct email, and analytics only if analytics is actually enabled;
3. the categories of data, exact purpose, legal basis, and legitimate interest for each;
4. named providers or meaningful recipient categories and their roles;
5. countries and safeguards for any non-EEA transfers, with a way to request a copy;
6. concrete retention periods or criteria;
7. rights to access, rectification, erasure, restriction, objection, and portability where applicable;
8. the right to complain to AZOP, with a link to [AZOP’s complaint process](https://azop.hr/zahtjev-za-utvrdivanje-povrede-prava/);
9. which form fields are required, why, and that the site cannot reply without a valid reply address;
10. that there is no automated decision-making or profiling;
11. how theme and language are stored locally and how the visitor can remove them;
12. a change log or updated date and a commitment to update the notice before enabling new processing.

If someone contacts the owner directly without first seeing the site, the first substantive reply should link to the applicable privacy notice.

Do not say that continued browsing constitutes consent. If future optional terminal access requires consent, it must be freely given, specific, informed, affirmative, rejectable before access, and as easy to withdraw as to give; pre-ticked controls or “accept only” designs are not valid ([GDPR Article 7](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504), [AZOP consent guidance](https://azop.hr/privola/), [AZOP cookie guide](https://azop.hr/vodic-o-obradi-osobnih-podataka-putem-kolacica/)).

## Security and operations

GDPR requires security appropriate to risk, including confidentiality, integrity, availability, resilience, restoration, and periodic evaluation where appropriate ([GDPR Article 32](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)). For this site:

- enforce HTTPS and modern transport security;
- enable MFA on hosting, CMS, source control, domain/DNS, email, and form-provider accounts;
- use least-privilege access and separate production secrets from source code;
- validate and bound form input server-side, encode output, use a restrictive content security policy, and keep dependencies patched;
- never log form payloads, email addresses, tokens, or CMS preview secrets;
- keep the admin/CMS surface authenticated and out of search indexes;
- make provider deletion and account recovery procedures available;
- test form delivery, deletion, and failure behaviour before launch and after provider changes;
- maintain a lightweight incident checklist and provider contact list.

Every suspected personal-data incident must be documented and assessed. If it is likely to risk people’s rights and freedoms, notify AZOP without undue delay and, where feasible, within 72 hours; high-risk breaches can also require notifying affected people ([AZOP breach guidance](https://azop.hr/izvjescivanje-o-povredi-osobnih-podataka/), [GDPR Articles 33–34](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)).

A basic portfolio using the controls above does not appear to involve the high-risk processing that ordinarily triggers a DPIA, but this must be revisited if monitoring, profiling, special-category data, large-scale processing, or new technology materially changes the risk ([GDPR Article 35](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504)).

## Release checklist

- [ ] Data inventory is complete and matches observed browser/network behaviour.
- [ ] Public pages make no unrequested third-party calls; fonts and media are self-hosted.
- [ ] Theme/locale storage contains only the selected value and occurs only after a manual choice.
- [ ] Contact form collects only name, email, and message; no attachments or marketing reuse.
- [ ] Honeypot, validation, rate limiting, and payload/log redaction are verified.
- [ ] Hosting, CMS, email, and form vendors pass the processor/transfer gate; signed/accepted DPAs are retained.
- [ ] Legitimate-interests assessments exist for contact handling, security logs, and abuse prevention.
- [ ] Queue, mailbox, log, and abuse-control retention/deletion are configured and tested.
- [ ] English and Croatian privacy notices reflect the deployed services exactly.
- [ ] Rights-request and incident procedures name an owner and working contact address.
- [ ] Analytics is disabled. Any future enablement requires all ten analytics criteria to pass.

## Re-review triggers and unresolved legal edges

Re-run the review before changing providers or enabling analytics, CAPTCHA, embedded third-party media, newsletters, accounts, payments, file uploads, advertising, A/B testing, session replay, precise geolocation, AI analysis of messages, or automated decisions.

The following are intentionally not declared settled:

- whether a particular “cookie-free” or server-side analytics implementation receives a Croatian Article 43 exemption;
- provider-specific controller/processor roles, subprocessors, data locations, and transfer safeguards before a provider is chosen and its current terms are inspected;
- obligations outside Croatia/EU for countries the site may later target;
- additional Croatian business/e-commerce disclosures if the portfolio begins offering or selling freelance services.

Those uncertainties do not block the privacy-minimal portfolio or the constrained contact form. They do block nonessential tracking and unreviewed third-party integrations.
