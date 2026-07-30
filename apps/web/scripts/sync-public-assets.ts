import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasSanityConfiguration,
  loadPublishedAbout,
  loadPublishedProjectDiagrams,
  loadPublishedProjects,
} from "@portfolio/content";

import { renderDiagramAssets } from "../../../scripts/diagram-pipeline";
import {
  croppedPortraitSource,
  portraitPublicPath,
  projectMediaPublicPath,
  resumePublicPaths,
  sharingImagePublicPath,
} from "../lib/public-assets";
import { siteOrigin } from "../lib/site-origin";

const webDirectory = fileURLToPath(new URL("../", import.meta.url));
const publicDirectory = join(webDirectory, "public");
const generatedDirectories = [
  join(publicDirectory, "media"),
  join(publicDirectory, "resume"),
];

async function resetGeneratedDirectories() {
  await Promise.all(
    generatedDirectories.map(async (directory) => {
      await rm(directory, { force: true, recursive: true });
      await mkdir(directory, { recursive: true });
    }),
  );
}

async function download(
  source: string,
  publicPath: string,
  expectedContentType: "application/pdf" | "image/",
) {
  const response = await fetch(source);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith(expectedContentType)) {
    throw new Error(
      `Unable to download ${publicPath}: ${response.status} ${contentType}.`,
    );
  }

  const destination = join(publicDirectory, publicPath.replace(/^\//, ""));
  const temporaryDestination = `${destination}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    temporaryDestination,
    Buffer.from(await response.arrayBuffer()),
  );
  await rename(temporaryDestination, destination);
}

async function main() {
  if (!hasSanityConfiguration()) {
    return;
  }

  siteOrigin({ required: true });
  const [about, projects, diagrams] = await Promise.all([
    loadPublishedAbout("en"),
    loadPublishedProjects("en"),
    loadPublishedProjectDiagrams(),
  ]);
  if (!about) {
    throw new Error(
      "Published About Me content is missing or invalid; preserving the last successful deployment.",
    );
  }
  const publishedProjects = projects?.entries ?? [];
  const publishedProjectSlugs = new Set(
    publishedProjects.map(({ slug }) => slug),
  );
  const publishedDiagrams = diagrams.filter(({ projectSlug }) =>
    publishedProjectSlugs.has(projectSlug),
  );

  await renderDiagramAssets(publishedDiagrams, publicDirectory);
  await resetGeneratedDirectories();
  await Promise.all([
    download(
      croppedPortraitSource(about.portrait),
      portraitPublicPath(about.portrait.url),
      "image/",
    ),
    download(
      about.metadata.image.url,
      sharingImagePublicPath(about.metadata.image.url),
      "image/",
    ),
    download(about.resumes.en.url, resumePublicPaths.en, "application/pdf"),
    download(about.resumes.hr.url, resumePublicPaths.hr, "application/pdf"),
    ...publishedProjects.flatMap((project) =>
      [...(project.heroMedia ? [project.heroMedia] : []), ...project.media].map(
        (media) =>
          download(
            media.url,
            projectMediaPublicPath(project.slug, media.key, media.url),
            "image/",
          ),
      ),
    ),
  ]);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
