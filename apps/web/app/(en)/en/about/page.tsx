import type { Metadata } from "next";

import { aboutMetadata, renderAboutRoute } from "../../../../lib/about-route";

export function generateMetadata(): Promise<Metadata> {
  return aboutMetadata("en");
}

export default function EnglishAboutPage() {
  return renderAboutRoute("en");
}
