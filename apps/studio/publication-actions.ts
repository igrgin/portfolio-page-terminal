import type { DocumentActionComponent } from "sanity";

const publicationManagedDocumentTypes = new Set([
  "siteSettings",
  "aboutMe",
  "contact",
  "privacyNotice",
  "profileMedia",
  "resumeSet",
  "experience",
  "education",
  "skill",
  "project",
]);

export const BatchManagedPublishAction: DocumentActionComponent = () => {
  return {
    disabled: true,
    label: "Publish through a ready batch",
    title:
      "Direct publication is disabled. Validate and publish the complete Publication batch.",
  };
};

BatchManagedPublishAction.action = "publish";

export function protectBatchPublicationActions(
  actions: readonly DocumentActionComponent[],
  schemaType: string,
): DocumentActionComponent[] {
  if (!publicationManagedDocumentTypes.has(schemaType)) {
    return [...actions];
  }
  return actions.map((action) =>
    action.action === "publish" ? BatchManagedPublishAction : action,
  );
}
