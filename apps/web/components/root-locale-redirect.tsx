"use client";

import React, { useEffect } from "react";

import { readLocalePreference } from "../lib/preferences";
import { destinationRoute } from "../lib/routing";

export function RootLocaleRedirect() {
  useEffect(() => {
    const locale = readLocalePreference(window.localStorage) ?? "en";
    window.location.replace(destinationRoute(locale, "about"));
  }, []);

  return (
    <main className="locale-redirect">
      <p>Opening the portfolio…</p>
      <a href={destinationRoute("en", "about")}>Continue to About Me</a>
    </main>
  );
}
