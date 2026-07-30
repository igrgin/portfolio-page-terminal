import type { Locale } from "@portfolio/content";

export type Destination =
  | "about"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "contact"
  | "privacy";

type LocalizedRoute = Readonly<{
  label: Readonly<Record<Locale, string>>;
  path: Readonly<Record<Locale, string>>;
}>;

const routes: Readonly<Record<Destination, LocalizedRoute>> = {
  about: {
    label: { en: "About Me", hr: "O meni" },
    path: { en: "/en/about", hr: "/hr/o-meni" },
  },
  experience: {
    label: { en: "Experience", hr: "Iskustvo" },
    path: { en: "/en/experience", hr: "/hr/iskustvo" },
  },
  education: {
    label: { en: "Education", hr: "Obrazovanje" },
    path: { en: "/en/education", hr: "/hr/obrazovanje" },
  },
  skills: {
    label: { en: "Skills", hr: "Vještine" },
    path: { en: "/en/skills", hr: "/hr/vjestine" },
  },
  projects: {
    label: { en: "Projects", hr: "Projekti" },
    path: { en: "/en/projects", hr: "/hr/projekti" },
  },
  contact: {
    label: { en: "Contact", hr: "Kontakt" },
    path: { en: "/en/contact", hr: "/hr/kontakt" },
  },
  privacy: {
    label: { en: "Privacy", hr: "Privatnost" },
    path: { en: "/en/privacy", hr: "/hr/privatnost" },
  },
};

export const primaryNavigation = (
  ["about", "experience", "education", "skills", "projects", "contact"] as const
).map((destination) => ({
  destination,
  ...routes[destination],
}));

export function destinationRoute(locale: Locale, destination: Destination) {
  return routes[destination].path[locale];
}

export function destinationLabel(locale: Locale, destination: Destination) {
  return routes[destination].label[locale];
}

export function pairedDestinationRoute(
  locale: Locale,
  destination: Destination,
) {
  return destinationRoute(locale === "en" ? "hr" : "en", destination);
}

export function projectRoute(locale: Locale, slug: string) {
  return `${destinationRoute(locale, "projects")}/${slug}`;
}

export type ApplicationRouteMode = "draft" | "public";

export function applicationRoute(
  path: string,
  mode: ApplicationRouteMode = "public",
) {
  return mode === "draft" ? `/draft${path}` : path;
}
