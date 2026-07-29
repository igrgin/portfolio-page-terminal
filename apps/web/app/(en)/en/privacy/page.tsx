import type { Metadata } from "next";

import {
  privacyMetadata,
  renderPrivacyRoute,
} from "../../../../lib/privacy-route";

export function generateMetadata(): Promise<Metadata> {
  return privacyMetadata("en");
}

export default function EnglishPrivacyPage() {
  return renderPrivacyRoute("en");
}
