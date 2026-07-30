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
  type SanityQueryOptions,
} from "./sanity";

const localizedPrivacyFields = [
  "controller",
  "purposesAndLegalBases",
  "processorsAndTransfers",
  "retention",
  "rightsAndRequests",
  "contactData",
  "localPreferences",
  "automatedDecisionMaking",
  "azopComplaint",
] as const;

type LocalizedPrivacyField = (typeof localizedPrivacyFields)[number];

export type PrivacyPageContent = Readonly<
  {
    azopUrl: string;
    contactChannels: readonly ContactChannel[];
    displayName: string;
    effectiveDate: string;
    metadata: Readonly<{
      image: Readonly<{
        height: number;
        url: string;
        width: number;
      }>;
    }>;
    privacyRequestEmail: string;
  } & Record<LocalizedPrivacyField, string>
>;

export const PRIVACY_PAGE_QUERY = defineQuery(`{
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
  "privacyNotice": *[
    _id == "privacyNotice" && !(_id in path("drafts.**"))
  ][0]{
    _id,
    effectiveDate,
    privacyRequestEmail,
    controller,
    purposesAndLegalBases,
    processorsAndTransfers,
    retention,
    rightsAndRequests,
    contactData,
    localPreferences,
    automatedDecisionMaking,
    azopComplaint,
    azopUrl
  }
}`);

function isoDate(value: unknown): string | null {
  const candidate = nonEmptyString(value);
  if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }

  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

function emailAddress(value: unknown): string | null {
  const candidate = nonEmptyString(value);
  return candidate &&
    candidate.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
      candidate,
    )
    ? candidate
    : null;
}

export function normalizePublishedPrivacy(
  value: unknown,
  locale: Locale,
): PrivacyPageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  const privacyNotice = publishedDocument(result?.privacyNotice);
  if (!siteSettings || !privacyNotice) {
    return null;
  }

  const displayName = nonEmptyString(siteSettings.displayName);
  const effectiveDate = isoDate(privacyNotice.effectiveDate);
  const privacyRequestEmail = emailAddress(
    privacyNotice.privacyRequestEmail,
  );
  const azopUrl = safeUrl(privacyNotice.azopUrl, ["https:"]);
  const contactChannels = normalizeContactChannels(
    siteSettings.contactChannels,
    locale,
  );
  const sharingImage = record(siteSettings.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);
  const localizedContent = Object.fromEntries(
    localizedPrivacyFields.map((field) => [
      field,
      localizedStrings(privacyNotice[field])?.[locale] ?? null,
    ]),
  ) as Record<LocalizedPrivacyField, string | null>;

  if (
    !displayName ||
    !effectiveDate ||
    !privacyRequestEmail ||
    !azopUrl ||
    !contactChannels ||
    !hasRequiredContactChannelOrder(contactChannels) ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
    localizedPrivacyFields.some((field) => !localizedContent[field])
  ) {
    return null;
  }

  return {
    ...(localizedContent as Record<LocalizedPrivacyField, string>),
    azopUrl,
    contactChannels,
    displayName,
    effectiveDate,
    metadata: {
      image: {
        height: sharingImageHeight,
        url: sharingImageUrl,
        width: sharingImageWidth,
      },
    },
    privacyRequestEmail,
  };
}

export async function loadPublishedPrivacy(
  locale: Locale,
  options?: SanityQueryOptions,
): Promise<PrivacyPageContent | null> {
  const result = await loadSanityQuery(PRIVACY_PAGE_QUERY, "Privacy", options);
  return normalizePublishedPrivacy(result, locale);
}
