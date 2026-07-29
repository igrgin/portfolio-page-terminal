import { defineCliConfig } from "sanity/cli";

import { studioEnvironment } from "./environment";

export default defineCliConfig({
  api: studioEnvironment,
  schemaExtraction: {
    enabled: true,
    enforceRequiredFields: true,
    path: "schema.json",
  },
  typegen: {
    enabled: true,
    generates: "../../packages/content/src/generated/sanity.types.ts",
    path: ["../web/**/*.{ts,tsx}", "./**/*.{ts,tsx}"],
    schema: "schema.json",
  },
});
