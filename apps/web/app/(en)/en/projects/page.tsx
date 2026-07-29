import {
  projectsMetadata,
  renderProjectsRoute,
} from "../../../../lib/projects-route";

export const generateMetadata = () => projectsMetadata("en");

export default function ProjectsPage() {
  return renderProjectsRoute("en");
}
