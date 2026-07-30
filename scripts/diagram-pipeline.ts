import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DOMParser } from "@xmldom/xmldom";
import {
  DIAGRAM_RENDER_TIMEOUT_MS,
  diagramAssetPublicPath,
  diagramThemes,
  validatePortfolioDiagram,
  type DiagramTheme,
  type Locale,
  type PortfolioDiagram,
} from "@portfolio/content";

export const DIAGRAM_RENDERER_VERSION = "11.16.0";

const MAX_GENERATED_SVG_BYTES = 2 * 1024 * 1024;
const repositoryDirectory = fileURLToPath(new URL("../", import.meta.url));
const mermaidCli = join(repositoryDirectory, "node_modules", ".bin", "mmdc");
const prohibitedSvgElements = new Set([
  "a",
  "embed",
  "foreignobject",
  "iframe",
  "image",
  "link",
  "object",
  "script",
]);
const renderLocales = ["en", "hr"] as const satisfies readonly Locale[];

export function chromiumArguments(runningInCi = process.env.CI === "true") {
  return [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE localhost",
    ...(runningInCi ? ["--no-sandbox", "--disable-setuid-sandbox"] : []),
  ];
}

const themeVariables: Readonly<
  Record<DiagramTheme, Readonly<Record<string, string>>>
> = {
  dark: {
    background: "#0b1118",
    edgeLabelBackground: "#111a24",
    lineColor: "#8fa3b8",
    mainBkg: "#111a24",
    nodeBorder: "#6ee7f5",
    primaryBorderColor: "#6ee7f5",
    primaryColor: "#111a24",
    primaryTextColor: "#eef6ff",
    secondaryColor: "#172331",
    tertiaryColor: "#0b1118",
    textColor: "#eef6ff",
  },
  light: {
    background: "#f7fafc",
    edgeLabelBackground: "#ffffff",
    lineColor: "#435468",
    mainBkg: "#ffffff",
    nodeBorder: "#006d77",
    primaryBorderColor: "#006d77",
    primaryColor: "#ffffff",
    primaryTextColor: "#17202a",
    secondaryColor: "#edf5f6",
    tertiaryColor: "#f7fafc",
    textColor: "#17202a",
  },
};

export type DiagramBuildInput = Readonly<{
  diagram: PortfolioDiagram;
  projectSlug: string;
}>;

export type RenderedDiagramAsset = Readonly<{
  locale: Locale;
  publicPath: string;
  theme: DiagramTheme;
}>;

export type RenderedDiagram = Readonly<{
  assets: readonly RenderedDiagramAsset[];
  diagramId: string;
  projectSlug: string;
}>;

export { diagramAssetPublicPath };

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function injectDiagramAccessibility(
  diagram: PortfolioDiagram,
  locale: Locale,
): string {
  const validation = validatePortfolioDiagram(diagram);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const source = validation.value.source[locale].trim();
  const newline = source.indexOf("\n");
  const opening = newline === -1 ? source : source.slice(0, newline);
  const body = newline === -1 ? "" : source.slice(newline + 1);
  const accessibility = [
    `  accTitle: ${singleLine(validation.value.title[locale])}`,
    `  accDescr: ${singleLine(validation.value.description[locale])}`,
  ].join("\n");

  return `${opening}\n${accessibility}${body ? `\n${body}` : ""}\n`;
}

function hasUnsafeUrl(value: string): boolean {
  const normalized = value.replace(/\s+/g, "").toLowerCase();
  if (
    /(?:https?|ftp|data|javascript|mailto):/.test(normalized) ||
    normalized.startsWith("//")
  ) {
    return true;
  }

  return Array.from(normalized.matchAll(/url\(([^)]+)\)/g)).some(
    ([, target]) => !target?.replace(/^['"]|['"]$/g, "").startsWith("#"),
  );
}

export function validateGeneratedSvg(
  svg: string,
  accessibility: Readonly<{ description: string; title: string }>,
): void {
  if (
    !svg.trim() ||
    new TextEncoder().encode(svg).byteLength > MAX_GENERATED_SVG_BYTES
  ) {
    throw new Error("Generated SVG is empty or exceeds the output limit.");
  }
  if (/<!DOCTYPE|<\?xml-stylesheet/i.test(svg)) {
    throw new Error(
      "Generated SVG contains a prohibited document declaration.",
    );
  }

  const parseErrors: string[] = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") {
        parseErrors.push(String(message));
      }
    },
  }).parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  if (parseErrors.length > 0 || root?.localName !== "svg") {
    throw new Error("Generated output is not a valid SVG document.");
  }

  const elements = Array.from(document.getElementsByTagName("*"));
  for (const element of elements) {
    const elementName = (element.localName ?? element.nodeName).toLowerCase();
    if (prohibitedSvgElements.has(elementName)) {
      throw new Error(
        `Generated SVG contains prohibited <${element.localName}> output.`,
      );
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeLocalName = attribute.localName?.toLowerCase() ?? "";
      if (
        attributeName.startsWith("on") ||
        attributeLocalName.startsWith("on")
      ) {
        throw new Error(
          `Generated SVG contains prohibited ${attribute.name} handler output.`,
        );
      }
      if (
        ["href", "src"].includes(attributeLocalName) &&
        !attribute.value.trim().startsWith("#")
      ) {
        throw new Error(
          `Generated SVG contains a prohibited resource in ${attribute.name}.`,
        );
      }
      if (
        attributeName !== "xmlns" &&
        !attributeName.startsWith("xmlns:") &&
        hasUnsafeUrl(attribute.value)
      ) {
        throw new Error(
          `Generated SVG contains a prohibited URL in ${attribute.name}.`,
        );
      }
    }

    if (
      elementName === "style" &&
      (/@import/i.test(element.textContent ?? "") ||
        hasUnsafeUrl(element.textContent ?? ""))
    ) {
      throw new Error("Generated SVG contains prohibited CSS resources.");
    }
  }

  const title = document.getElementsByTagName("title").item(0)?.textContent;
  const description = document
    .getElementsByTagName("desc")
    .item(0)?.textContent;
  if (
    singleLine(title ?? "") !== singleLine(accessibility.title) ||
    singleLine(description ?? "") !== singleLine(accessibility.description)
  ) {
    throw new Error(
      "Generated SVG is missing the renderer-owned title or description.",
    );
  }
}

export function generatedSvgUpgradeFingerprint(svg: string): string {
  return createHash("sha256").update(svg).digest("hex");
}

export function withRenderTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DIAGRAM_RENDER_TIMEOUT_MS,
  onTimeout: () => void = () => undefined,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`Diagram render timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function rendererConfiguration(
  diagramId: string,
  locale: Locale,
  theme: DiagramTheme,
) {
  return {
    deterministicIDSeed: `${DIAGRAM_RENDERER_VERSION}:${diagramId}:${locale}:${theme}`,
    deterministicIds: true,
    flowchart: {
      curve: "linear",
      htmlLabels: false,
      useMaxWidth: false,
    },
    fontFamily: "Arial, sans-serif",
    htmlLabels: false,
    securityLevel: "strict",
    sequence: {
      useMaxWidth: false,
      wrap: false,
    },
    startOnLoad: false,
    theme: "base",
    themeVariables: themeVariables[theme],
  };
}

async function runMermaidCli(
  arguments_: readonly string[],
  timeoutMs: number,
): Promise<void> {
  let stderr = "";
  const child = spawn(mermaidCli, arguments_, {
    cwd: repositoryDirectory,
    env: {
      ...process.env,
      NO_PROXY: "*",
      no_proxy: "*",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-16_384);
  });

  const completion = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Mermaid CLI failed (${signal ?? code ?? "unknown"}): ${
              stderr.trim() || "no diagnostic output"
            }`,
          ),
        );
      }
    });
  });
  await withRenderTimeout(completion, timeoutMs, () => child.kill("SIGKILL"));
}

async function renderAsset(
  input: DiagramBuildInput,
  locale: Locale,
  theme: DiagramTheme,
  stagingDirectory: string,
  timeoutMs: number,
): Promise<RenderedDiagramAsset> {
  const publicPath = diagramAssetPublicPath(
    input.projectSlug,
    input.diagram.id,
    locale,
    theme,
  );
  const relativePath = publicPath.replace(/^\/generated\/diagrams\//, "");
  const outputPath = join(stagingDirectory, relativePath);
  const workDirectory = await mkdtemp(
    join(stagingDirectory, `.render-${input.diagram.id}-${locale}-${theme}-`),
  );
  const sourcePath = join(workDirectory, "source.mmd");
  const configPath = join(workDirectory, "mermaid.json");
  const puppeteerPath = join(workDirectory, "puppeteer.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(
      sourcePath,
      injectDiagramAccessibility(input.diagram, locale),
      "utf8",
    ),
    writeFile(
      configPath,
      `${JSON.stringify(
        rendererConfiguration(input.diagram.id, locale, theme),
        null,
        2,
      )}\n`,
      "utf8",
    ),
    writeFile(
      puppeteerPath,
      `${JSON.stringify(
        {
          args: chromiumArguments(),
          headless: "shell",
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
  ]);

  try {
    await runMermaidCli(
      [
        "--input",
        sourcePath,
        "--output",
        outputPath,
        "--configFile",
        configPath,
        "--puppeteerConfigFile",
        puppeteerPath,
        "--backgroundColor",
        "transparent",
        "--svgId",
        `diagram-${input.diagram.id}-${locale}-${theme}`,
        "--quiet",
      ],
      timeoutMs,
    );
    const svg = await readFile(outputPath, "utf8");
    validateGeneratedSvg(svg, {
      description: input.diagram.description[locale],
      title: input.diagram.title[locale],
    });
  } finally {
    await rm(workDirectory, { force: true, recursive: true });
  }

  return { locale, publicPath, theme };
}

async function replaceGeneratedDirectory(
  stagingDirectory: string,
  finalDirectory: string,
): Promise<void> {
  const backupDirectory = `${finalDirectory}.backup-${process.pid}-${Date.now()}`;
  let hadPreviousDirectory = false;
  try {
    await rename(finalDirectory, backupDirectory);
    hadPreviousDirectory = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    await rename(stagingDirectory, finalDirectory);
  } catch (error) {
    if (hadPreviousDirectory) {
      await rename(backupDirectory, finalDirectory);
    }
    throw error;
  }

  if (hadPreviousDirectory) {
    await rm(backupDirectory, { force: true, recursive: true });
  }
}

export async function renderDiagramAssets(
  inputs: readonly DiagramBuildInput[],
  publicDirectory: string,
  timeoutMs = DIAGRAM_RENDER_TIMEOUT_MS,
): Promise<readonly RenderedDiagram[]> {
  const generatedParent = join(publicDirectory, "generated");
  const finalDirectory = join(generatedParent, "diagrams");
  await mkdir(generatedParent, { recursive: true });
  const stagingDirectory = await mkdtemp(join(generatedParent, ".diagrams-"));

  try {
    const identities = new Set<string>();
    const rendered: RenderedDiagram[] = [];
    for (const input of inputs) {
      const validation = validatePortfolioDiagram(input.diagram);
      if (!validation.ok) {
        throw new Error(
          `Invalid ${input.projectSlug}/${String(input.diagram?.id)}: ${
            validation.error
          }`,
        );
      }
      diagramAssetPublicPath(
        input.projectSlug,
        validation.value.id,
        "en",
        "light",
      );
      const identity = `${input.projectSlug}/${validation.value.id}`;
      if (identities.has(identity)) {
        throw new Error(`Duplicate diagram identity: ${identity}.`);
      }
      identities.add(identity);

      const assets: RenderedDiagramAsset[] = [];
      for (const locale of renderLocales) {
        for (const theme of diagramThemes) {
          assets.push(
            await renderAsset(
              { ...input, diagram: validation.value },
              locale,
              theme,
              stagingDirectory,
              timeoutMs,
            ),
          );
        }
      }
      rendered.push({
        assets,
        diagramId: validation.value.id,
        projectSlug: input.projectSlug,
      });
    }

    await replaceGeneratedDirectory(stagingDirectory, finalDirectory);
    return rendered;
  } catch (error) {
    await rm(stagingDirectory, { force: true, recursive: true });
    throw error;
  }
}
