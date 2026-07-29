import {
  projectsMetadata,
  renderProjectsRoute,
} from "../../../../lib/projects-route";

export const generateMetadata = () => projectsMetadata("hr");

export default function ProjectsPage() {
  return renderProjectsRoute("hr");
}
