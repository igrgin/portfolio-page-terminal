import {
  renderSkillsRoute,
  skillsMetadata,
} from "../../../../lib/skills-route";

export const generateMetadata = () => skillsMetadata("hr");

export default function SkillsPage() {
  return renderSkillsRoute("hr");
}
