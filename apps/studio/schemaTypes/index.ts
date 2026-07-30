import { aboutMe } from "./about";
import { contact, privacyNotice } from "./contact-privacy";
import { education, relevantSubject } from "./education";
import { experience } from "./experience";
import {
  localizedMetadata,
  localizedString,
  localizedStringList,
  localizedText,
} from "./localized";
import { project, projectDiagram, projectMedia } from "./project";
import { skill } from "./references";
import { contactChannel, profileMedia, resumeSet, siteSettings } from "./site";

export const schemaTypes = [
  localizedString,
  localizedText,
  localizedStringList,
  localizedMetadata,
  projectMedia,
  projectDiagram,
  relevantSubject,
  contactChannel,
  siteSettings,
  aboutMe,
  contact,
  privacyNotice,
  experience,
  profileMedia,
  resumeSet,
  skill,
  project,
  education,
];
