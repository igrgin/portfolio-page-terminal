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
import {
  publicationAssetCheck,
  publicationBatch,
  publicationDeployment,
  publicationPreviewAcknowledgements,
  publicationReadinessIssue,
  publicationRecovery,
  publicationRecord,
  publicationReleaseLimits,
  publicationRevisionEvidence,
  publicationRollbackEvidence,
  publicationValidation,
  publicationWorkflow,
} from "./publication-batch";
import { skill } from "./references";
import { contactChannel, profileMedia, resumeSet, siteSettings } from "./site";

export const schemaTypes = [
  localizedString,
  localizedText,
  localizedStringList,
  localizedMetadata,
  projectMedia,
  projectDiagram,
  publicationReadinessIssue,
  publicationAssetCheck,
  publicationReleaseLimits,
  publicationValidation,
  publicationRevisionEvidence,
  publicationPreviewAcknowledgements,
  publicationRollbackEvidence,
  publicationRecord,
  publicationDeployment,
  publicationRecovery,
  publicationWorkflow,
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
  publicationBatch,
];
