import type { Metadata } from "next";

import {
  experienceMetadata,
  renderExperienceRoute,
} from "../../../../lib/experience-route";

export function generateMetadata(): Promise<Metadata> {
  return experienceMetadata("hr");
}

export default function CroatianExperiencePage() {
  return renderExperienceRoute("hr");
}
