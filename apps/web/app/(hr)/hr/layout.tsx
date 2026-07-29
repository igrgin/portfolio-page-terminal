import React, { type ReactNode } from "react";

import { RootDocument } from "../../root-document";

export default function CroatianLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RootDocument locale="hr">{children}</RootDocument>;
}
