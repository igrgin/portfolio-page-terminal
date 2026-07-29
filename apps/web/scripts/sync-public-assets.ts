import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasSanityConfiguration, loadPublishedAbout } from "@portfolio/content";

import {
  croppedPortraitSource,
  portraitPublicPath,
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
  const content = await loadPublishedAbout("en");
  if (!content) {
    throw new Error(
      "Published About Me content is missing or invalid; preserving the last successful deployment.",
    );
  }

  await resetGeneratedDirectories();
  await Promise.all([
    download(
      croppedPortraitSource(content.portrait),
      portraitPublicPath(content.portrait.url),
      "image/",
    ),
    download(
      content.metadata.image.url,
      sharingImagePublicPath(content.metadata.image.url),
      "image/",
    ),
    download(content.resumes.en.url, resumePublicPaths.en, "application/pdf"),
    download(content.resumes.hr.url, resumePublicPaths.hr, "application/pdf"),
  ]);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
