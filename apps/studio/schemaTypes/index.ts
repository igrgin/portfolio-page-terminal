import { aboutMe } from "./about";
import { education, relevantSubject } from "./education";
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
  relevantSubject,
  contactChannel,
  siteSettings,
  aboutMe,
  experience,
  profileMedia,
  resumeSet,
  skill,
  project,
  education,
];
