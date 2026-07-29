import type { Metadata } from "next";

import {
  experienceMetadata,
  renderExperienceRoute,
} from "../../../../lib/experience-route";

export function generateMetadata(): Promise<Metadata> {
  return experienceMetadata("en");
}

export default function EnglishExperiencePage() {
  return renderExperienceRoute("en");
}
