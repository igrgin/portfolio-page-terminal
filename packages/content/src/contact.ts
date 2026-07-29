import { defineQuery } from "groq";

import type { Locale } from "./index";
import {
  loadSanityQuery,
  hasRequiredContactChannelOrder,
  localizedStrings,
  nonEmptyString,
  normalizeContactChannels,
  positiveNumber,
  publishedDocument,
  record,
  safeUrl,
  type ContactChannel,
} from "./sanity";

export type ContactPageContent = Readonly<{
  availability?: string;
  contactChannels: readonly ContactChannel[];
  displayName: string;
  introduction: string;
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

export const CONTACT_PAGE_QUERY = defineQuery(`{
  "siteSettings": *[_id == "siteSettings" && !(_id in path("drafts.**"))][0]{
    _id,
    displayName,
    "defaultSharingImage": {
      "url": defaultSharingImage.asset->url,
      "width": defaultSharingImage.asset->metadata.dimensions.width,
      "height": defaultSharingImage.asset->metadata.dimensions.height
    },
    contactChannels[]{_key, kind, label, href}
  },
  "contact": *[_id == "contact" && !(_id in path("drafts.**"))][0]{
    _id,
    introduction,
    availability
  }
}`);

export function normalizePublishedContact(
  value: unknown,
  locale: Locale,
): ContactPageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  const contact = publishedDocument(result?.contact);
  if (!siteSettings || !contact) {
    return null;
  }

  const displayName = nonEmptyString(siteSettings.displayName);
  const introduction = localizedStrings(contact.introduction);
  const availability =
    contact.availability == null
      ? undefined
      : localizedStrings(contact.availability);
  const contactChannels = normalizeContactChannels(
    siteSettings.contactChannels,
    locale,
  );
  const sharingImage = record(siteSettings.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);

  if (
    !displayName ||
    !introduction ||
    availability === null ||
    !contactChannels ||
    !hasRequiredContactChannelOrder(contactChannels) ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight
  ) {
    return null;
  }

  return {
    ...(availability ? { availability: availability[locale] } : {}),
    contactChannels,
    displayName,
    introduction: introduction[locale],
    metadata: {
      image: {
        height: sharingImageHeight,
        url: sharingImageUrl,
        width: sharingImageWidth,
      },
    },
  };
}

export async function loadPublishedContact(
  locale: Locale,
): Promise<ContactPageContent | null> {
  const result = await loadSanityQuery(CONTACT_PAGE_QUERY, "Contact");
  return normalizePublishedContact(result, locale);
}
