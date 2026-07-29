import {
  renderSkillsRoute,
  skillsMetadata,
} from "../../../../lib/skills-route";

export const generateMetadata = () => skillsMetadata("en");

export default function SkillsPage() {
  return renderSkillsRoute("en");
}
