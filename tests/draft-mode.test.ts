import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  createDraftAccessToken,
  draftSessionCookie,
  validateDraftAccessToken,
} from "../apps/web/lib/draft-session";
import {
  endDraftSession,
  startDraftSession,
  type DraftCookieStore,
} from "../apps/web/lib/draft-session-handler";
import { loadDraftBatchScope } from "../apps/web/lib/draft-content";
import {
  loadSanityQuery,
} from "../packages/content/src/sanity";
import { publicationBatchRevision } from "../packages/content/src";
import { DraftModeBanner } from "../apps/web/components/draft-mode-banner";
import { resolveDraftDestination } from "../apps/web/lib/draft-application";
import { buildDraftMetadata } from "../apps/web/lib/draft-route";
import { applicationRoute } from "../apps/web/lib/routing";

const now = new Date("2026-07-30T12:00:00.000Z");
const secret = "server-only-draft-secret-with-at-least-32-characters";
const batchRevision = "a".repeat(64);

test("Draft Mode accepts only an untampered short-lived batch token", async () => {
  const token = await createDraftAccessToken(secret, batchRevision, {
    now,
    ttlSeconds: 600,
  });

  assert.deepEqual(
    await validateDraftAccessToken(token, secret, now),
    {
      batchRevision,
      expiresAt: now.valueOf() + 600_000,
    },
  );
  assert.equal(
    await validateDraftAccessToken(`${token.slice(0, -1)}x`, secret, now),
    null,
  );
  assert.equal(
    await validateDraftAccessToken(
      token,
      secret,
      new Date(now.valueOf() + 600_001),
    ),
    null,
  );
  await assert.rejects(
    createDraftAccessToken(secret, batchRevision, {
      now,
      ttlSeconds: 901,
    }),
    /15 minutes/,
  );
});

test("the browser receives only a secure expiring session cookie, never server credentials", async () => {
  const token = await createDraftAccessToken(secret, batchRevision, {
    now,
    ttlSeconds: 300,
  });
  const session = await validateDraftAccessToken(token, secret, now);
  assert.ok(session);

  const cookie = draftSessionCookie(token, session.expiresAt, {
    production: true,
  });

  assert.equal(cookie.name, "__Host-portfolio-draft");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "strict");
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.path, "/");
  assert.equal(cookie.options.expires.valueOf(), session.expiresAt);
  assert.doesNotMatch(
    JSON.stringify({ token, cookie }),
    /SANITY_API_READ_TOKEN|server-only-draft-secret/,
  );
});

test("the Draft Mode HTTP boundary rejects invalid tokens, strips valid tokens, and exits reliably", async () => {
  const writes: unknown[] = [];
  const deletions: string[] = [];
  const cookieStore: DraftCookieStore = {
    delete(name) {
      deletions.push(name);
    },
    set(cookie) {
      writes.push(cookie);
    },
  };
  const invalidRequest = new Request("https://portfolio.example/api/draft/session", {
    body: new URLSearchParams({
      redirectTo: "/draft/en/about",
      token: "invalid-token-that-must-not-be-echoed",
    }),
    method: "POST",
  });

  const invalidResponse = await startDraftSession(invalidRequest, {
    cookieStore,
    now,
    production: true,
    secret,
  });
  assert.equal(invalidResponse.status, 401);
  assert.doesNotMatch(
    await invalidResponse.text(),
    /invalid-token-that-must-not-be-echoed/,
  );
  assert.deepEqual(writes, []);

  const token = await createDraftAccessToken(secret, batchRevision, {
    now,
    ttlSeconds: 300,
  });
  const validRequest = new Request("https://portfolio.example/api/draft/session", {
    body: new URLSearchParams({
      redirectTo: "/draft/hr/projekti/event-platform",
      token,
    }),
    method: "POST",
  });
  const validResponse = await startDraftSession(validRequest, {
    cookieStore,
    now,
    production: true,
    secret,
  });
  assert.equal(validResponse.status, 303);
  assert.equal(
    validResponse.headers.get("location"),
    "https://portfolio.example/draft/hr/projekti/event-platform",
  );
  assert.equal(validResponse.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.doesNotMatch(validResponse.headers.get("location") ?? "", /token|v1\./);
  assert.equal(writes.length, 1);

  const exitResponse = endDraftSession(
    "https://portfolio.example/api/draft/session/exit",
    cookieStore,
  );
  assert.equal(exitResponse.status, 303);
  assert.equal(exitResponse.headers.get("location"), "https://portfolio.example/");
  assert.deepEqual(deletions, ["__Host-portfolio-draft"]);
});

test("draft content overlays only the validated batch and keeps the Sanity credential server-side", async () => {
  const requests: Array<Readonly<{ input: string; init?: RequestInit }>> = [];
  const results = [
    {
      projects: [
        { _id: "project.allowed", title: { en: "Published allowed" } },
        { _id: "project.outside", title: { en: "Published outside" } },
      ],
    },
    {
      projects: [
        {
          _id: "drafts.project.allowed",
          title: { en: "Draft allowed" },
        },
        {
          _id: "drafts.project.outside",
          title: { en: "Draft outside" },
        },
        {
          _id: "drafts.project.unlisted",
          title: { en: "Unlisted draft" },
        },
      ],
    },
  ];
  const fetcher = async (
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ) => {
    requests.push({ input: String(input), ...(init ? { init } : {}) });
    return Response.json({ result: results[requests.length - 1] });
  };

  const result = await loadSanityQuery(
    `{"projects": *[
      _type == "project" && !(_id in path("drafts.**"))
    ]{_id, title}}`,
    "Draft projects",
    {
      documentIds: ["project.allowed"],
      environment: {
        SANITY_DATASET: "production",
        SANITY_PROJECT_ID: "portfolio",
      },
      fetcher,
      mode: "draft",
      token: "server-only-sanity-read-token",
    },
  );

  assert.deepEqual(result, {
    projects: [
      { _id: "project.allowed", title: { en: "Draft allowed" } },
      { _id: "project.outside", title: { en: "Published outside" } },
    ],
  });
  assert.equal(requests.length, 2);
  assert.match(requests[0]!.input, /apicdn\.sanity\.io/);
  assert.doesNotMatch(
    JSON.stringify(requests[0]!.init?.headers),
    /server-only-sanity-read-token/,
  );
  assert.match(requests[1]!.input, /api\.sanity\.io/);
  assert.match(requests[1]!.input, /perspective=previewDrafts/);
  assert.doesNotMatch(requests[1]!.input, /path%28%22drafts/);
  assert.equal(
    (requests[1]!.init?.headers as Record<string, string>).Authorization,
    "Bearer server-only-sanity-read-token",
  );
  assert.doesNotMatch(JSON.stringify(result), /server-only-sanity-read-token/);
});

test("a Draft Mode session is isolated to a still-current validated batch revision", async () => {
  const documents = [
    {
      _id: "drafts.project.allowed",
      _rev: "project-r2",
      _updatedAt: "2026-07-30T12:00:00.000Z",
    },
    {
      _id: "drafts.skill.kafka",
      _rev: "skill-r3",
      _updatedAt: "2026-07-30T12:00:00.000Z",
    },
  ];
  const revision = publicationBatchRevision(documents);
  const requested: Array<Readonly<{ input: string; init?: RequestInit }>> = [];
  const fetcher = async (
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ) => {
    requested.push({ input: String(input), ...(init ? { init } : {}) });
    return Response.json({
      result: {
        documents,
        name: "July portfolio refresh",
        validation: { ready: true, revision },
      },
    });
  };
  const environment = {
    SANITY_DATASET: "production",
    SANITY_PROJECT_ID: "portfolio",
  };

  assert.deepEqual(
    await loadDraftBatchScope(revision, "server-only-sanity-read-token", {
      environment,
      fetcher,
    }),
    {
      documentIds: ["project.allowed", "skill.kafka"],
      name: "July portfolio refresh",
      revision,
    },
  );
  assert.match(requested[0]!.input, /api\.sanity\.io/);
  assert.equal(
    (requested[0]!.init?.headers as Record<string, string>).Authorization,
    "Bearer server-only-sanity-read-token",
  );

  const editedFetcher = async () =>
    Response.json({
      result: {
        documents: [{ ...documents[0], _rev: "project-r3" }, documents[1]],
        name: "July portfolio refresh",
        validation: { ready: true, revision },
      },
    });
  assert.equal(
    await loadDraftBatchScope(revision, "server-only-sanity-read-token", {
      environment,
      fetcher: editedFetcher,
    }),
    null,
  );
});

test("Draft Mode is visibly non-indexable and keeps real application links inside preview", () => {
  assert.equal(
    applicationRoute("/en/projects/event-platform", "draft"),
    "/draft/en/projects/event-platform",
  );
  assert.equal(
    applicationRoute("/en/projects/event-platform", "public"),
    "/en/projects/event-platform",
  );
  assert.deepEqual(
    buildDraftMetadata({
      description: "Candidate metadata",
      title: "Candidate Project",
    }),
    {
      description: "Candidate metadata",
      robots: {
        follow: false,
        index: false,
        nocache: true,
      },
      title: "Candidate Project",
    },
  );

  const markup = renderToStaticMarkup(
    React.createElement(DraftModeBanner, {
      batchName: "July portfolio refresh",
      expiresAt: new Date("2026-07-30T12:10:00.000Z"),
      locale: "en",
      revision: "a".repeat(64),
    }),
  );
  assert.match(markup, /Draft Mode/);
  assert.match(markup, /July portfolio refresh/);
  assert.match(markup, /href="\/draft\/en\/about"/);
  assert.match(markup, /href="\/draft\/hr\/o-meni"/);
  assert.match(markup, /action="\/api\/draft\/session\/exit"/);
  assert.doesNotMatch(markup, /server-only|SANITY_API_READ_TOKEN|v1\./);
});

test("every localized main route and Project detail resolves inside the Draft Mode application", () => {
  assert.deepEqual(resolveDraftDestination("en", ["about"]), {
    destination: "about",
  });
  assert.deepEqual(resolveDraftDestination("hr", ["iskustvo"]), {
    destination: "experience",
  });
  assert.deepEqual(resolveDraftDestination("hr", ["obrazovanje"]), {
    destination: "education",
  });
  assert.deepEqual(resolveDraftDestination("hr", ["vjestine"]), {
    destination: "skills",
  });
  assert.deepEqual(resolveDraftDestination("hr", ["projekti"]), {
    destination: "projects",
  });
  assert.deepEqual(
    resolveDraftDestination("hr", ["projekti", "event-platform"]),
    { destination: "project", slug: "event-platform" },
  );
  assert.deepEqual(resolveDraftDestination("hr", ["kontakt"]), {
    destination: "contact",
  });
  assert.deepEqual(resolveDraftDestination("hr", ["privatnost"]), {
    destination: "privacy",
  });
  assert.equal(resolveDraftDestination("en", ["projects", "a", "b"]), null);
});
