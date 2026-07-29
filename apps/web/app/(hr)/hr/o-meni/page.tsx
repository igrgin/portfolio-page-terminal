import type { Metadata } from "next";

import { aboutMetadata, renderAboutRoute } from "../../../../lib/about-route";

export function generateMetadata(): Promise<Metadata> {
  return aboutMetadata("hr");
}

export default function CroatianAboutPage() {
  return renderAboutRoute("hr");
}
