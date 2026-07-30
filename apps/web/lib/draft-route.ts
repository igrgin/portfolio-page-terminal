import type { Metadata } from "next";

type DraftSharingImage = Readonly<{
  alt: string;
  height: number;
  url: string;
  width: number;
}>;

export function buildDraftMetadata(
  metadata: Metadata,
  sharingImage?: DraftSharingImage,
): Metadata {
  return {
    ...metadata,
    ...(sharingImage && metadata.openGraph
      ? {
          openGraph: {
            ...metadata.openGraph,
            images: [sharingImage],
          },
        }
      : {}),
    robots: {
      follow: false,
      index: false,
      nocache: true,
    },
    ...(sharingImage && metadata.twitter
      ? {
          twitter: {
            ...metadata.twitter,
            images: [sharingImage],
          },
        }
      : {}),
  };
}
