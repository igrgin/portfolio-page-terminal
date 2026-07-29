import type { Metadata } from "next";

import {
  privacyMetadata,
  renderPrivacyRoute,
} from "../../../../lib/privacy-route";

export function generateMetadata(): Promise<Metadata> {
  return privacyMetadata("hr");
}

export default function CroatianPrivacyPage() {
  return renderPrivacyRoute("hr");
}
