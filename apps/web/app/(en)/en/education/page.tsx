import {
  educationMetadata,
  renderEducationRoute,
} from "../../../../lib/education-route";

export const generateMetadata = () => educationMetadata("en");

export default function EducationPage() {
  return renderEducationRoute("en");
}
