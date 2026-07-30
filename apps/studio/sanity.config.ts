import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { studioEnvironment } from "./environment";
import { schemaTypes } from "./schemaTypes";

const singletons = [
  { id: "siteSettings", title: "Site settings", type: "siteSettings" },
  { id: "aboutMe", title: "About Me", type: "aboutMe" },
  { id: "contact", title: "Contact", type: "contact" },
  { id: "privacyNotice", title: "Privacy notice", type: "privacyNotice" },
  { id: "profileMedia", title: "Profile media", type: "profileMedia" },
  { id: "resumeSet", title: "Résumé set", type: "resumeSet" },
] as const;
const singletonTypes = new Set(singletons.map(({ type }) => type));

export default defineConfig({
  document: {
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType as (typeof singletons)[number]["type"])
        ? actions.filter(({ action }) => action !== "duplicate" && action !== "delete")
        : actions,
  },
  name: "portfolio",
  title: "Portfolio",
  ...studioEnvironment,
  plugins: [
    structureTool({
      structure: (list) =>
        list
          .list()
          .title("Portfolio content")
          .items([
            ...singletons.map(({ id, title, type }) =>
              list
                .listItem()
                .id(id)
                .title(title)
                .child(list.document().schemaType(type).documentId(id)),
            ),
            list.divider(),
            list.documentTypeListItem("experience").title("Experience"),
            list.documentTypeListItem("education").title("Education"),
            list.documentTypeListItem("skill").title("Skills"),
            list.documentTypeListItem("project").title("Projects"),
            list.divider(),
            list
              .documentTypeListItem("publicationBatch")
              .title("Publication batches"),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
  },
});
