import type { MetadataRoute } from "next";

import { absoluteSiteUrl, siteOrigin } from "../lib/site-origin";

export function buildRobots(
  origin = siteOrigin(),
): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/api/preview", "/studio"],
      userAgent: "*",
    },
    sitemap: absoluteSiteUrl("/sitemap.xml", origin),
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
