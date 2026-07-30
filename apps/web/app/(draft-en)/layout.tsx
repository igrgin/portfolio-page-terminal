import React, { type ReactNode } from "react";

import { RootDocument } from "../root-document";

export default function EnglishDraftLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
