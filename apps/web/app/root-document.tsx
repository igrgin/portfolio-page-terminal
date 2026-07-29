import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@portfolio/ui/tokens.css";
import "./globals.css";

import type { Locale } from "@portfolio/content";
import React, { type ReactNode } from "react";

import { themeBootstrapScript } from "../lib/preferences";

export function RootDocument({
  children,
  locale,
}: Readonly<{ children: ReactNode; locale: Locale }>) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
