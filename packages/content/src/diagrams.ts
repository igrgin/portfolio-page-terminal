import type { Locale, LocalizedValue } from "./index";
import { localizedStrings, nonEmptyString, record } from "./sanity";

export const DIAGRAM_SOURCE_MAX_BYTES = 50 * 1024;
export const DIAGRAM_RENDER_TIMEOUT_MS = 10_000;

export const diagramKinds = [
  "architecture",
  "deployment",
  "data-flow",
  "sequence",
] as const;
export type DiagramKind = (typeof diagramKinds)[number];

export const diagramThemes = ["light", "dark"] as const;
export type DiagramTheme = (typeof diagramThemes)[number];

export type PortfolioDiagram = Readonly<{
  caption: LocalizedValue<string>;
  description: LocalizedValue<string>;
  id: string;
  kind: DiagramKind;
  source: LocalizedValue<string>;
  title: LocalizedValue<string>;
}>;

export type DiagramValidationResult =
  | Readonly<{ ok: true; value: PortfolioDiagram }>
  | Readonly<{ error: string; ok: false }>;

export const DIAGRAM_PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isDiagramPathSegment(value: unknown): value is string {
  return typeof value === "string" && DIAGRAM_PATH_SEGMENT_PATTERN.test(value);
}

export function diagramAssetPublicPath(
  projectSlug: string,
  diagramId: string,
  locale: Locale,
  theme: DiagramTheme,
): string {
  if (!isDiagramPathSegment(projectSlug) || !isDiagramPathSegment(diagramId)) {
    throw new Error("Diagram paths require lowercase kebab-case identifiers.");
  }
  return `/generated/diagrams/${projectSlug}/${diagramId}/${locale}-${theme}.svg`;
}

const flowchartOpening = /^flowchart (?:TB|TD|BT|RL|LR)$/;
const forbiddenMermaidSource = [
  {
    message: "Mermaid frontmatter and directives are not allowed.",
    pattern: /(?:^|\n)\s*(?:---|%%\{)/i,
  },
  {
    message: "Mermaid accessibility metadata is owned by the renderer.",
    pattern: /(?:^|\n)\s*acc(?:Title|Descr)\s*[:{]/i,
  },
  {
    message: "Interactive Mermaid actions and links are not allowed.",
    pattern:
      /(?:(?:^|\n)\s*(?:click|href|link|links)\b|(?:https?|ftp|data|javascript|mailto):|\/\/)/i,
  },
  {
    message: "HTML labels are not allowed.",
    pattern: /<\/?[a-z][^>]*>/i,
  },
  {
    message:
      "Remote assets, includes, imports, and icon syntax are not allowed.",
    pattern: /(?:(?:^|\n)\s*(?:include|import)\b|@\{)/i,
  },
  {
    message: "Diagram styling is owned by the renderer.",
    pattern: /(?:^|\n)\s*(?:classDef|class|style|linkStyle)\b/i,
  },
] as const;

function isConstrainedFlowchartLine(line: string): boolean {
  return (
    /^(?:%%|subgraph\b|end$|direction (?:TB|TD|BT|RL|LR)$)/i.test(line) ||
    /(?:-->|---|-\.-?>|==>|<-->|--[ox]|~~~)/.test(line) ||
    /^[a-z_][a-z0-9_-]*\s*(?:\[[\s\S]*\]|\([\s\S]*\)|\{[\s\S]*\})$/i.test(line)
  );
}

function isConstrainedSequenceLine(line: string): boolean {
  return (
    /^%%/.test(line) ||
    /^(?:(?:create\s+)?(?:participant|actor)\s+\S|destroy\s+\S|(?:activate|deactivate)\s+\S|autonumber\b)/i.test(
      line,
    ) ||
    /^(?:alt|else|opt|loop|par|and|critical|option|break|rect|box)\b/i.test(
      line,
    ) ||
    /^end$/i.test(line) ||
    /^note\s+(?:left of|right of|over)\s+\S/i.test(line) ||
    /^\S+\s*(?:--?>{1,2}|--?[x)])\s*\S+\s*:/.test(line)
  );
}

function validateConstrainedBody(
  source: string,
  kind: DiagramKind,
): string | null {
  const lines = source
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);
  const validLine =
    kind === "sequence"
      ? isConstrainedSequenceLine
      : isConstrainedFlowchartLine;

  return lines.every(validLine)
    ? null
    : "Source contains syntax outside the approved constrained subset.";
}

function invalid(error: string): DiagramValidationResult {
  return { error, ok: false };
}

function validateSource(source: string, kind: DiagramKind): string | null {
  if (new TextEncoder().encode(source).byteLength > DIAGRAM_SOURCE_MAX_BYTES) {
    return `Mermaid source exceeds the ${DIAGRAM_SOURCE_MAX_BYTES}-byte limit.`;
  }
  if (source.includes("\0")) {
    return "Mermaid source cannot contain null bytes.";
  }

  const opening = source.trimStart().split(/\r?\n/, 1)[0]?.trim() ?? "";
  const expectedSequence = kind === "sequence";
  if (
    (expectedSequence && opening !== "sequenceDiagram") ||
    (!expectedSequence && !flowchartOpening.test(opening))
  ) {
    return expectedSequence
      ? "Sequence diagrams must start with sequenceDiagram."
      : "Architecture, deployment, and data-flow diagrams must start with a directional flowchart declaration.";
  }

  return (
    forbiddenMermaidSource.find(({ pattern }) => pattern.test(source))
      ?.message ?? validateConstrainedBody(source, kind)
  );
}

export function validatePortfolioDiagram(
  value: unknown,
): DiagramValidationResult {
  const diagram = record(value);
  const id = nonEmptyString(diagram?.id);
  const kind =
    typeof diagram?.kind === "string" &&
    diagramKinds.includes(diagram.kind as DiagramKind)
      ? (diagram.kind as DiagramKind)
      : null;
  const source = localizedStrings(diagram?.source);
  const title = localizedStrings(diagram?.title);
  const caption = localizedStrings(diagram?.caption);
  const description = localizedStrings(diagram?.description);

  if (!id || !isDiagramPathSegment(id)) {
    return invalid("Use a lowercase kebab-case diagram ID.");
  }
  if (!kind) {
    return invalid("Choose an approved diagram kind.");
  }
  if (!source || !title || !caption || !description) {
    return invalid(
      "English and Croatian source, title, caption, and prose description are required.",
    );
  }

  for (const locale of ["en", "hr"] as const) {
    const sourceError = validateSource(source[locale], kind);
    if (sourceError) {
      return invalid(`${locale.toUpperCase()}: ${sourceError}`);
    }
  }

  return { ok: true, value: value as PortfolioDiagram };
}
