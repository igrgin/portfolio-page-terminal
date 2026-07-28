# Near-zero-cost contact-form delivery

**Status:** Recommended v1 design, subject to the release gates below  
**Target architecture:** Static-first Next.js on Cloudflare Workers through OpenNext  
**Reviewed:** 28 July 2026

> This report applies the repository's [Croatian/EU privacy baseline](https://github.com/igrgin/portfolio-page-terminal/blob/06bf61d2ddc1cf9d70a9cb07708d02af856842c8/docs/research/privacy-compliance-baseline.md). It is product and technical research, not legal advice.

## Decision

Include the contact form in v1 **conditionally**, using:

1. a same-origin Next.js Route Handler running in the existing Cloudflare Worker;
2. server-side validation, a honeypot, and short-lived rate limiting implemented at that route;
3. Amazon SES in an EEA region as a relay to one fixed, verified owner mailbox; and
4. direct email, LinkedIn, GitHub, and telephone links that are always visible and remain usable when the form is unavailable.

Use Amazon SES in its sandbox for launch. Verify the owner's address as both the sender identity and sole recipient, set the visitor's address only as `Reply-To`, and grant the Worker only `ses:SendEmail` permission for that exact sender and recipient. The sandbox is not a problem for this one-recipient design: SES permits sending only to verified recipients while sandboxed, with a default quota of 200 messages per 24 hours and one message per second ([SES sandbox restrictions](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html), [verified identities](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html)).

This is near-zero-cost rather than guaranteed free. New SES accounts start on the Essentials plan, which has no fixed monthly charge and costs USD 0.16 per 1,000 messages in the first volume tier; AWS also permits switching to à-la-carte pricing. Fifty legitimate messages in a month would therefore cost USD 0.008 before negligible message-data charges ([current SES plan pricing](https://aws.amazon.com/ses/pricing/), [July 2026 plan announcement](https://aws.amazon.com/blogs/messaging-and-targeting/introducing-amazon-simple-email-service-ses-pricing-plans/)). The already-required Cloudflare Worker remains within its free allowance at portfolio traffic; the Free plan allows 100,000 Worker requests per day ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)).

Do not add a form database, delivery webhooks, automated sender acknowledgements, attachments, CAPTCHA, analytics, or message-content logs in v1.

If the exact sender/recipient test does not reliably reach the owner's inbox, or if the AWS processor/transfer record cannot pass the privacy baseline at implementation time, **do not silently substitute another form vendor**. Launch with the direct contact links and add the form after a custom domain is available.

## Why this design

Cloudflare's OpenNext adapter supports Next.js Route Handlers, so the form can use a server endpoint without changing the static-first public architecture ([Cloudflare's Next.js support](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)). The endpoint sends one email and stores no application record. SES's `SendEmail` operation immediately queues an accepted message; unlike a hosted form inbox, it does not require an additional submission archive ([SES `SendEmail`](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html)).

SES accepts individual email-address identities, so a custom domain is not required for the initial relay. However, an individually verified address cannot gain DKIM signing unless its parent domain is controlled and configured. AWS recommends authenticated mail for deliverability, so inbox placement must be tested rather than assumed ([creating SES identities](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html), [DKIM considerations](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html), [authentication guidance](https://docs.aws.amazon.com/ses/latest/dg/configure-identities.html)).

AWS's Data Processing Addendum applies automatically when AWS processes customer data, and its Service Terms incorporate the EU Standard Contractual Clauses for relevant third-country transfers ([AWS Service Terms, section 1.14](https://aws.amazon.com/service-terms/), [AWS DPA summary](https://docs.aws.amazon.com/whitepapers/latest/navigating-gdpr-compliance/aws-data-processing-addendum-dpa.html)). Select an EEA SES region, preferably Europe (Frankfurt), and record the exact service, region, support-access path, subprocessors, and transfer mechanism in the portfolio's data inventory. AWS says customer data remains in the selected region except where transfer is necessary to provide or maintain the service or comply with law; this still requires the implementation-time transfer record rather than an assumption that “EU region” ends the review ([AWS transfer summary](https://docs.aws.amazon.com/whitepapers/latest/navigating-gdpr-compliance/in-summary.html), [AWS subprocessor list](https://aws.amazon.com/compliance/sub-processors/)).

## Request and message contract

The public form has exactly three required fields:

| Field | Server constraint | Email use |
| --- | --- | --- |
| Name | Trimmed plain text, 1–100 Unicode characters | Message body only |
| Reply email | Trimmed, syntactically valid address, maximum 254 characters | `Reply-To` only |
| Message | Trimmed plain text, 10–5,000 Unicode characters | Message body only |

The route must also:

- accept only `POST` with a small JSON body, capped before parsing;
- reject cross-origin browser submissions using `Origin` and Fetch Metadata checks, while treating those checks as defence in depth rather than authentication;
- perform the same schema validation on the server regardless of client validation;
- use a fixed sender, fixed recipient, and fixed subject such as `Portfolio contact message`;
- render the notification as plain text, never interpolate visitor content into HTML or mail headers;
- exclude attachments and tell visitors not to submit confidential, special-category, or unnecessary personal data;
- never echo submitted content in the response;
- never put the message, name, or email into URLs, exceptions, traces, metrics, or `console.*` output; and
- disable the submit button while the request is pending to reduce accidental duplicates.

The visitor address must not be used as `From`. A fixed verified sender prevents header spoofing and avoids making the Worker a general-purpose relay. SES supports a separate reply-to address ([SES `SendEmail` request model](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html)).

## Abuse protection

Start without a CAPTCHA, as required by the privacy baseline.

Use all of the following:

1. A visually hidden, non-focusable honeypot. If it is populated, return the same generic success response but do not call SES.
2. A strict request-body limit and the field limits above.
3. A Cloudflare Workers Rate Limiting binding on the contact route. Apply both a conservative per-location route ceiling and a short-lived key derived from an HMAC of the connecting IP. Never store or log the raw IP, rotate the HMAC secret, and keep the rate window at 60 seconds or less.
4. The SES sandbox's 200-message daily ceiling as a final cost and abuse cap.
5. A fixed recipient restriction in both application configuration and AWS IAM.

Cloudflare describes its rate-limit counters as local to each location, permissive, and eventually consistent, so they reduce abuse rather than guarantee a global quota. Its own guidance also warns that IP-based keys can affect unrelated people behind shared addresses. Keep the per-IP-derived threshold lenient enough for retries and retain the direct links as an escape hatch ([Workers Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).

Do not add Turnstile, reCAPTCHA, hCaptcha, or another bot-scoring product pre-emptively. If measured abuse defeats the first-party controls, pause the form or lower the SES ceiling, then run the privacy baseline's provider and Croatian ePrivacy review before introducing a CAPTCHA.

## Credentials and least privilege

Store the AWS access-key ID, secret access key, SES region, fixed sender, and fixed recipient as Cloudflare Worker secrets or non-secret deployment configuration as appropriate. Cloudflare secrets are encrypted bindings whose values are hidden after configuration; `.dev.vars` and `.env` files containing live credentials must never be committed ([Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)).

Create a dedicated IAM principal for this form. Its policy should:

- allow only `ses:SendEmail`, not `ses:*` or `ses:SendRawEmail`;
- scope the resource to the one verified SES identity;
- restrict `ses:FromAddress` and `ses:Recipients` to the configured owner address;
- require secure transport; and
- have no AWS Console access.

SES IAM policies can restrict the action, identity resource, From address, and recipients ([SES IAM controls](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html)). Enable MFA on the AWS and Cloudflare owner accounts, rotate the Worker credential on a schedule and after any suspected exposure, and document revocation.

## Retention and processor posture

The application must not create a form-submission table, queue, KV record, webhook store, or local backup. Do not enable SES Mail Manager archiving, configuration-set event payload storage, or delivery webhooks for v1. Do not log the SES request or response body.

The only durable copy should be the delivered message in the owner's mailbox. Apply the privacy baseline's mailbox rule: delete it six months after the last meaningful exchange unless it has become part of a separately justified recruitment, employment, or contractual record. Spam should be deleted promptly.

SES necessarily handles message content while queuing, scanning, retrying, and delivering it. The `SendEmail` documentation describes immediate queueing, while AWS explains that SES scans accepted content and may retry temporary delivery failures ([SES send process](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-process.html)). Before launch, verify the then-current SES service documentation for transient queue deletion and support access; record any residual uncertainty in the data inventory. This design avoids a second customer-visible archive, but it does not claim that a relay processes zero transient copies.

The localized privacy notices must name or clearly categorize:

- Cloudflare as host and route processor;
- Amazon Web Services / SES as message relay, including the selected region and transfer safeguard;
- the owner's mailbox provider as the final recipient system; and
- the stated mailbox retention and rights contact.

Complete the legitimate-interests assessment required by the privacy baseline before enabling the route.

## Quotas, cost, and operations

| Layer | Launch limit or cost | Required response |
| --- | --- | --- |
| Cloudflare Worker | 100,000 requests/day on Free | Form traffic is negligible; monitor only aggregate response codes without payloads |
| Route rate limit | Implementation-selected, short window | Return localized `429`; leave direct links visible |
| SES sandbox | 200 messages/24 hours, 1 message/second | Do not request production access for the one-recipient design |
| SES Essentials | USD 0.16/1,000 in first tier, no fixed fee | Configure a very low AWS budget alert; disable sending on unexpected use |
| Mailbox | Existing provider | Test inbox and spam-folder delivery; apply deletion routine |

Operational burden is moderate: one AWS account, one verified email identity in one region, one dedicated IAM credential, billing alerts, periodic credential rotation, and delivery tests. This is more setup than a hosted form endpoint, but it is small, auditable, and avoids a second durable form inbox.

Test at launch, after dependency or provider changes, and at least quarterly:

- valid English and Croatian submissions;
- invalid fields, oversized bodies, honeypot behaviour, cross-origin requests, and rate limiting;
- Worker timeout and SES rejection paths;
- inbox and spam-folder delivery;
- secret revocation;
- absence of payloads in Cloudflare and application logs; and
- mailbox deletion and privacy-request handling.

## Failure behaviour

An SES API success means the message was accepted for delivery, not that it reached the inbox. The UI should say **“Your message was accepted”**, not “delivered.”

On validation failure, return field-specific errors without clearing valid inputs. On rate limiting, ask the visitor to wait and show direct contact choices. On a provider error or timeout, do not automatically retry: AWS documents rare cases where SES accepts a message even though the caller receives a timeout or server error, so a retry can create a duplicate ([SES sending errors](https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-error-messages.html)). Instead:

- show “Delivery could not be confirmed”;
- preserve the typed text only in the current page memory;
- offer a copy-to-clipboard action;
- display the direct email, LinkedIn, GitHub, and phone links; and
- invite the visitor to use direct email if the message is important.

Never hide the fallback links behind a failed form state. Do not include the message body in a `mailto:` URL by default because URLs can be retained in browser and system history.

## Alternatives considered

### Cloudflare Email Service: preferred after a custom domain, not for the free-URL launch

Cloudflare Email Service is architecturally cleaner: the Worker can use a native binding restricted to one verified destination, with no external API credential. Sending to verified destination addresses is free on all Workers plans ([Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [send-binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/)).

It cannot satisfy the current launch conditions because the sender must belong to an onboarded domain using Cloudflare DNS. The project intentionally launches on a free provider URL and owns no custom domain ([Email Service setup](https://developers.cloudflare.com/email-service/get-started/send-emails/)). The sending product is also still labelled beta. Re-evaluate it when a domain is acquired; approve migration only after confirming production status, message/log retention, DPA scope, and the same failure tests.

### Resend Free: reject for v1

Resend is easy to integrate and its test domain can send to the account owner's own address without a custom domain. Its Free plan allows 3,000 transactional messages per month and 100 per day, and its DPA includes subprocessors, SCCs, and EU–US Data Privacy Framework language ([test-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [Resend DPA](https://resend.com/legal/dpa), [subprocessors](https://resend.com/legal/subprocessors)).

It fails the agreed retention gate. Resend keeps email data for 30 days, exposes previews of message content, and makes full API request bodies available in logs. Disabling message-content storage requires a paid plan, at least one month of prior use, more than 3,000 sent messages, and a USD 50/month add-on ([retention](https://resend.com/pricing/), [email previews](https://resend.com/docs/dashboard/emails/introduction), [full request logs](https://resend.com/docs/dashboard/logs/introduction), [content-storage opt-out](https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend)). That conflicts with the no-durable-relay-copy design and near-zero-cost constraint.

### Formspree Free: reject for v1

Formspree requires almost no backend code and provides rate limiting and spam controls. Its Free plan starts at 50 submissions per month, but stores 30 days of submission history; the service-wide form endpoint limit is 20 posts per minute ([account limits](https://help.formspree.io/articles/account-management/account-limits/), [system limits](https://help.formspree.io/articles/form-and-project-settings/system-limits/)). Its standard anti-spam path uses Google reCAPTCHA, while custom spam rules are a Business-plan feature ([reCAPTCHA settings](https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings/), [form rules](https://help.formspree.io/articles/advanced-features/form-rules)).

Formspree publishes security and SCC statements, but its public Free-plan documentation does not establish a configurable sub-seven-day deletion mode for ordinary submissions ([Formspree security](https://formspree.io/security/)). The separate form inbox and default CAPTCHA also conflict with the privacy-minimal launch design.

### Browser-only email services and uncontracted free relays: reject

Do not put an email-provider secret in browser code, trust client-side validation, or adopt a relay whose public terms do not establish an Article 28 DPA, subprocessors, transfer mechanism, retention, deletion, and incident handling. A public endpoint identifier is not itself a secret, but browser-to-provider submission also bypasses the server controls and log policy defined above.

### Direct links only: mandatory fallback

Direct email, LinkedIn, GitHub, and telephone links are not a failed design; they are the reliable baseline. They must ship regardless of whether the form passes its release gates.

## Release gates

- [ ] The exact owner address is verified as both sender and recipient in one EEA SES region.
- [ ] Multiple real messages reach the inbox and spam folder is checked; unauthenticated address-identity delivery is acceptable.
- [ ] AWS DPA, region, subprocessors, support access, and any non-EEA transfer path are recorded; applicable SCC/TIA steps are complete.
- [ ] A dedicated IAM principal can call only `ses:SendEmail` for the exact sender and recipient.
- [ ] AWS credentials are Cloudflare secrets, absent from source, build output, browser bundles, and logs.
- [ ] Name, reply email, message, and request-size validation is enforced server-side.
- [ ] Honeypot and rate limiting reject abuse without storing raw IP addresses or form payloads.
- [ ] No form database, archive, webhook store, automated acknowledgement, attachment, or CAPTCHA is enabled.
- [ ] Cloudflare, application, SES, and mailbox handling matches the data inventory and bilingual privacy notices.
- [ ] Legitimate-interests assessment and mailbox deletion routine are complete.
- [ ] Success, rejection, timeout, duplicate-risk, quota, and secret-revocation behaviour is tested.
- [ ] Direct email, LinkedIn, GitHub, and phone links remain visible in every state.
- [ ] If any gate fails, the form is disabled and the direct contact links ship on their own.

## Re-review triggers

Re-run this decision before leaving the SES sandbox, changing sender or destination, adding a custom domain, migrating to Cloudflare Email Service, adding CAPTCHA or automated acknowledgements, accepting attachments, persisting submissions, adding delivery webhooks, or materially increasing traffic.
