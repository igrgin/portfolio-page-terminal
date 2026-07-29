import type { Metadata } from "next";

import {
  contactMetadata,
  renderContactRoute,
} from "../../../../lib/contact-route";

export function generateMetadata(): Promise<Metadata> {
  return contactMetadata("hr");
}

export default function CroatianContactPage() {
  return renderContactRoute("hr");
}
