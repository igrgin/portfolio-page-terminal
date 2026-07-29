import {
  projectMetadata,
  projectStaticParams,
  renderProjectRoute,
} from "../../../../../lib/projects-route";

type ProjectRouteProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export const dynamicParams = false;
export const generateStaticParams = projectStaticParams;

export async function generateMetadata({ params }: ProjectRouteProps) {
  const { slug } = await params;
  return projectMetadata("en", slug);
}

export default async function ProjectPage({ params }: ProjectRouteProps) {
  const { slug } = await params;
  return renderProjectRoute("en", slug);
}
