import type { Metadata } from "next";

import {
  contactMetadata,
  renderContactRoute,
} from "../../../../lib/contact-route";

export function generateMetadata(): Promise<Metadata> {
  return contactMetadata("en");
}

export default function EnglishContactPage() {
  return renderContactRoute("en");
}
