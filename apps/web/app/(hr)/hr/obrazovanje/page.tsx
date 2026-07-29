import {
  educationMetadata,
  renderEducationRoute,
} from "../../../../lib/education-route";

export const generateMetadata = () => educationMetadata("hr");

export default function EducationPage() {
  return renderEducationRoute("hr");
}
