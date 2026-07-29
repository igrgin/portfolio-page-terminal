import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { studioEnvironment } from "./environment";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "portfolio",
  title: "Portfolio",
  ...studioEnvironment,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
