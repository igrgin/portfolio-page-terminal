import type { AboutPageContent, Locale } from "@portfolio/content";

export const resumePublicPaths: Readonly<Record<Locale, string>> = {
  en: "/resume/ivo-grgin-resume-en.pdf",
  hr: "/resume/ivo-grgin-zivotopis-hr.pdf",
};

const imageExtensionPattern = /\.(avif|jpe?g|png|webp)$/i;

function imageExtension(remoteUrl: string): string {
  try {
    return (
      new URL(remoteUrl).pathname
        .match(imageExtensionPattern)?.[1]
        ?.toLowerCase() ?? "jpg"
    );
  } catch {
    return "jpg";
  }
}

export function portraitPublicPath(remoteUrl: string): string {
  return `/media/ivo-grgin-portrait.${imageExtension(remoteUrl)}`;
}

export function sharingImagePublicPath(remoteUrl: string): string {
  return `/media/ivo-grgin-profile-share.${imageExtension(remoteUrl)}`;
}

export function croppedPortraitPosition(
  portrait: AboutPageContent["portrait"],
): Readonly<{ x: number; y: number }> {
  const { crop, hotspot } = portrait;
  const x = (hotspot.x - crop.left) / (1 - crop.left - crop.right);
  const y = (hotspot.y - crop.top) / (1 - crop.top - crop.bottom);

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export function croppedPortraitDimensions(
  portrait: AboutPageContent["portrait"],
): Readonly<{ height: number; width: number }> {
  const { crop, height, width } = portrait;
  return {
    height: Math.max(1, Math.round(height * (1 - crop.top - crop.bottom))),
    width: Math.max(1, Math.round(width * (1 - crop.left - crop.right))),
  };
}

export function croppedPortraitSource(
  portrait: AboutPageContent["portrait"],
): string {
  const { crop, height, url, width } = portrait;
  const left = Math.round(width * crop.left);
  const top = Math.round(height * crop.top);
  const { height: croppedHeight, width: croppedWidth } =
    croppedPortraitDimensions(portrait);
  const source = new URL(url);

  source.searchParams.set(
    "rect",
    `${left},${top},${croppedWidth},${croppedHeight}`,
  );
  return source.toString();
}
