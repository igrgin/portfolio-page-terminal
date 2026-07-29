import { aboutMe } from "./about";
import { experience } from "./experience";
import {
  localizedMetadata,
  localizedString,
  localizedStringList,
  localizedText,
} from "./localized";
import { project, skill } from "./references";
import { contactChannel, profileMedia, resumeSet, siteSettings } from "./site";

export const schemaTypes = [
  localizedString,
  localizedText,
  localizedStringList,
  localizedMetadata,
  contactChannel,
  siteSettings,
  aboutMe,
  experience,
  profileMedia,
  resumeSet,
  skill,
  project,
];
