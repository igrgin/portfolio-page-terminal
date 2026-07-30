import type { Metadata } from "next";
import React from "react";

import { buildDraftMetadata } from "../../../lib/draft-route";

export const metadata: Metadata = buildDraftMetadata({
  description:
    "Owner-only entry to a validated bilingual Publication batch preview.",
  title: "Draft Mode access",
});

export default function DraftModeAccessPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Readonly<{ expired?: string }>>;
}>) {
  return (
    <main className="draft-access">
      <section aria-labelledby="draft-access-heading">
        <p className="eyebrow">Owner review</p>
        <h1 id="draft-access-heading">Draft Mode</h1>
        <p>
          Enter a short-lived token for the exact validated Publication batch.
          The token is submitted in the request body and removed before the
          preview opens.
        </p>
        <React.Suspense>
          <ExpiryNotice searchParams={searchParams} />
        </React.Suspense>
        <form action="/api/draft/session" method="post">
          <label htmlFor="draft-token">Time-limited access token</label>
          <input
            autoComplete="off"
            id="draft-token"
            maxLength={500}
            name="token"
            required
            spellCheck={false}
            type="password"
          />
          <input
            name="redirectTo"
            type="hidden"
            value="/draft/en/about"
          />
          <button type="submit">Open validated batch</button>
        </form>
      </section>
    </main>
  );
}

async function ExpiryNotice({
  searchParams,
}: Readonly<{
  searchParams: Promise<Readonly<{ expired?: string }>>;
}>) {
  const parameters = await searchParams;
  return parameters.expired === "1" ? (
    <p role="status">
      The Draft Mode session expired or its batch changed. Validate the current
      batch and enter a new token.
    </p>
  ) : null;
}
