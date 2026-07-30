import React, { type ReactNode } from "react";

import { RootDocument } from "../root-document";

export default function CroatianDraftLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RootDocument locale="hr">{children}</RootDocument>;
}
