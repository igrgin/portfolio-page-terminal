import {
  loadPublishedAbout,
  loadPublishedContact,
  loadPublishedEducation,
  loadPublishedExperience,
  loadPublishedPrivacy,
  loadPublishedProjects,
  loadPublishedSkills,
  locales,
  type ProjectsPageContent,
} from "@portfolio/content";
import type { MetadataRoute } from "next";

import {
  type Destination,
  destinationRoute,
  projectRoute,
} from "../lib/routing";
import { absoluteSiteUrl, siteOrigin } from "../lib/site-origin";

type SitemapInventory = Readonly<{
  projects: ProjectsPageContent | null;
  publishedDestinations: readonly Destination[];
}>;

export function buildSitemap(
  inventory: SitemapInventory,
  origin = siteOrigin(),
): MetadataRoute.Sitemap {
  const mainRoutes = locales.flatMap((locale) =>
    inventory.publishedDestinations.map((destination) => ({
      changeFrequency: "monthly" as const,
      priority: destination === "about" ? 1 : 0.8,
      url: absoluteSiteUrl(destinationRoute(locale, destination), origin),
    })),
  );
  const projectRoutes =
    inventory.projects?.entries.flatMap(({ slug }) =>
      locales.map((locale) => ({
        changeFrequency: "monthly" as const,
        priority: 0.7,
        url: absoluteSiteUrl(projectRoute(locale, slug), origin),
      })),
    ) ?? [];

  return [...mainRoutes, ...projectRoutes];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    about,
    experience,
    education,
    skills,
    projects,
    contact,
    privacy,
  ] = await Promise.all([
    loadPublishedAbout("en"),
    loadPublishedExperience("en"),
    loadPublishedEducation("en"),
    loadPublishedSkills("en"),
    loadPublishedProjects("en"),
    loadPublishedContact("en"),
    loadPublishedPrivacy("en"),
  ]);
  const publishedDestinations = [
    ...(about ? (["about"] as const) : []),
    ...(experience ? (["experience"] as const) : []),
    ...(education ? (["education"] as const) : []),
    ...(skills ? (["skills"] as const) : []),
    ...(projects ? (["projects"] as const) : []),
    ...(contact ? (["contact"] as const) : []),
    ...(privacy ? (["privacy"] as const) : []),
  ];

  return buildSitemap({ projects, publishedDestinations });
}
