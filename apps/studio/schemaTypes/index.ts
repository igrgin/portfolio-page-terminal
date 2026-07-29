import { aboutMe } from "./about";
import { localizedMetadata, localizedString, localizedText } from "./localized";
import { project, skill } from "./references";
import { contactChannel, profileMedia, resumeSet, siteSettings } from "./site";

export const schemaTypes = [
  localizedString,
  localizedText,
  localizedMetadata,
  contactChannel,
  siteSettings,
  aboutMe,
  profileMedia,
  resumeSet,
  skill,
  project,
];
