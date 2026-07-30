import type { DocumentActionComponent } from "sanity";
import { publicationManagedDocumentTypes } from "@portfolio/content";

const publicationManagedDocumentTypeSet = new Set(
  publicationManagedDocumentTypes,
);

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
  if (
    schemaType !== "publicationBatch" &&
    !publicationManagedDocumentTypeSet.has(
      schemaType as (typeof publicationManagedDocumentTypes)[number],
    )
  ) {
    return [...actions];
  }
  return actions.map((action) =>
    action.action === "publish" ? BatchManagedPublishAction : action,
  );
}
