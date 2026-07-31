#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Coverage = Readonly<{
  assets: true;
  documents: true;
  drafts: true;
  privateRollbackDataset: false;
}>;

type ExportArchiveCounts = Readonly<{
  assetFiles: number;
  assetReferences: number;
  documents: number;
  drafts: number;
}>;

type ExportEvidence = Readonly<{
  archiveSha256: string;
  coverage: Coverage;
  counts: ExportArchiveCounts;
  dataset: string;
  evidenceDate: string;
  exportedAt: string;
  projectId: string;
  status: "succeeded";
}>;

const fullExportCoverage: Coverage = {
  assets: true,
  documents: true,
  drafts: true,
  privateRollbackDataset: false,
};
const sanityBinary = fileURLToPath(
  new URL("../node_modules/.bin/sanity", import.meta.url),
);
const identifierPattern = /^[a-z0-9][a-z0-9_-]*$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

function parseArguments(argv: readonly string[]) {
  const [command, ...tokens] = argv;
  if (command !== "export" && command !== "restore") {
    throw new Error("Choose either the export or restore command.");
  }
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (!token?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token ?? ""}`);
    }
    const value = tokens[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}.`);
    }
    values.set(token.slice(2), value);
    index += 1;
  }
  return { command, dryRun, values };
}

function required(values: ReadonlyMap<string, string>, name: string): string {
  const value = values.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required --${name}.`);
  }
  return value;
}

function validatedIdentifier(value: string, label: string): string {
  if (!identifierPattern.test(value)) {
    throw new Error(`${label} must be a lowercase Sanity identifier.`);
  }
  return value;
}

function validatedDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !datePattern.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Evidence date must use a real YYYY-MM-DD date.");
  }
  return value;
}

async function sha256(path: string): Promise<string> {
  return new Promise<string>((resolveHash, rejectHash) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", rejectHash);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

async function runCommand(command: readonly string[]): Promise<void> {
  await new Promise<void>((resolveRun, rejectRun) => {
    const child = spawn(command[0]!, command.slice(1), {
      env: process.env,
      stdio: ["inherit", "inherit", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) {
        if (/Asset failed with HTTP\s+(?:401|403|404)/u.test(stderr)) {
          rejectRun(
            new Error(
              "Sanity excluded an inaccessible asset; the export is incomplete.",
            ),
          );
          return;
        }
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `Sanity CLI failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}.`,
        ),
      );
    });
  });
}

async function captureCommand(command: readonly string[]): Promise<string> {
  return new Promise<string>((resolveCapture, rejectCapture) => {
    const child = spawn(command[0]!, command.slice(1), {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectCapture);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolveCapture(stdout);
        return;
      }
      rejectCapture(
        new Error(
          `Archive inspection failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}: ${stderr.trim()}`,
        ),
      );
    });
  });
}

function collectSanityAssetPaths(value: unknown, paths: Set<string>): void {
  if (typeof value === "string") {
    const match = /^(?:image|file)@file:\/\/\.\/((?:images|files)\/.+)$/u.exec(
      value,
    );
    if (match?.[1]) {
      if (match[1].split("/").includes("..")) {
        throw new Error("The Sanity export contains an unsafe asset path.");
      }
      paths.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSanityAssetPaths(entry, paths));
    return;
  }
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((entry) =>
      collectSanityAssetPaths(entry, paths),
    );
  }
}

async function inspectExportArchive(
  archivePath: string,
): Promise<ExportArchiveCounts> {
  const entries = (await captureCommand(["tar", "-tzf", archivePath]))
    .split("\n")
    .filter(Boolean);
  const dataEntries = entries.filter(
    (entry) => entry === "data.ndjson" || entry.endsWith("/data.ndjson"),
  );
  if (dataEntries.length !== 1) {
    throw new Error(
      "A complete Sanity export must contain exactly one data.ndjson.",
    );
  }
  const dataEntry = dataEntries[0]!;
  const prefix = dataEntry.slice(0, -"data.ndjson".length);
  const documents = (
    await captureCommand(["tar", "-xOzf", archivePath, "--", dataEntry])
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
  const assetPaths = new Set<string>();
  documents.forEach((document) =>
    collectSanityAssetPaths(document, assetPaths),
  );
  const entrySet = new Set(entries);
  for (const assetPath of assetPaths) {
    if (!entrySet.has(`${prefix}${assetPath}`)) {
      throw new Error(
        `The Sanity export is missing referenced asset ${assetPath}.`,
      );
    }
  }
  const assetFiles = entries.filter(
    (entry) =>
      (entry.startsWith(`${prefix}images/`) ||
        entry.startsWith(`${prefix}files/`)) &&
      !entry.endsWith("/"),
  ).length;
  const drafts = documents.filter((document) => {
    if (typeof document !== "object" || document === null) {
      return false;
    }
    return String((document as Record<string, unknown>)._id).startsWith(
      "drafts.",
    );
  }).length;

  return {
    assetFiles,
    assetReferences: assetPaths.size,
    documents: documents.length,
    drafts,
  };
}

async function exportDataset(
  values: ReadonlyMap<string, string>,
  dryRun: boolean,
) {
  const projectId = validatedIdentifier(
    required(values, "project-id"),
    "Project ID",
  );
  const dataset = validatedIdentifier(required(values, "dataset"), "Dataset");
  const rollbackDataset = validatedIdentifier(
    required(values, "rollback-dataset"),
    "Rollback dataset",
  );
  if (dataset === rollbackDataset) {
    throw new Error(
      "The private rollback dataset must never be exported by this automation.",
    );
  }
  const output = resolve(required(values, "output"));
  const evidence = resolve(required(values, "evidence"));
  if (output === evidence) {
    throw new Error("Export archive and evidence require different paths.");
  }
  const evidenceDate = validatedDate(required(values, "date"));
  const command = [
    sanityBinary,
    "datasets",
    "export",
    dataset,
    output,
    "--project-id",
    projectId,
    "--overwrite",
    "--mode",
    "stream",
  ] as const;
  const plan = {
    command,
    coverage: fullExportCoverage,
    evidence,
    evidenceDate,
    output,
  };
  if (dryRun) {
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    return;
  }

  await mkdir(dirname(output), { recursive: true });
  await mkdir(dirname(evidence), { recursive: true });
  await runCommand(command);
  const counts = await inspectExportArchive(output);
  const result: ExportEvidence = {
    archiveSha256: await sha256(output),
    coverage: fullExportCoverage,
    counts,
    dataset,
    evidenceDate,
    exportedAt: new Date().toISOString(),
    projectId,
    status: "succeeded",
  };
  await writeFile(evidence, `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600,
  });
  process.stdout.write(
    `${JSON.stringify({ ...plan, archiveSha256: result.archiveSha256, status: result.status })}\n`,
  );
}

function isVerifiedExportEvidence(value: unknown): value is ExportEvidence {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const evidence = value as Partial<ExportEvidence>;
  const isCount = (count: unknown) =>
    Number.isSafeInteger(count) && Number(count) >= 0;
  return (
    evidence.status === "succeeded" &&
    typeof evidence.archiveSha256 === "string" &&
    typeof evidence.projectId === "string" &&
    typeof evidence.dataset === "string" &&
    isCount(evidence.counts?.assetFiles) &&
    isCount(evidence.counts?.assetReferences) &&
    isCount(evidence.counts?.documents) &&
    isCount(evidence.counts?.drafts) &&
    evidence.coverage?.assets === true &&
    evidence.coverage.documents === true &&
    evidence.coverage.drafts === true &&
    evidence.coverage.privateRollbackDataset === false
  );
}

async function restoreDataset(
  values: ReadonlyMap<string, string>,
  dryRun: boolean,
) {
  const source = resolve(required(values, "source"));
  const exportEvidencePath = resolve(required(values, "export-evidence"));
  const productionProjectId = validatedIdentifier(
    required(values, "production-project-id"),
    "Production project ID",
  );
  const targetProjectId = validatedIdentifier(
    required(values, "target-project-id"),
    "Target project ID",
  );
  if (targetProjectId === productionProjectId) {
    throw new Error(
      "Restore requires a different non-production Sanity project.",
    );
  }
  const targetDataset = validatedIdentifier(
    required(values, "target-dataset"),
    "Target dataset",
  );
  const evidence = resolve(required(values, "evidence"));
  const evidenceDate = validatedDate(required(values, "date"));
  const sourceEvidence = JSON.parse(
    await readFile(exportEvidencePath, "utf8"),
  ) as unknown;
  if (!isVerifiedExportEvidence(sourceEvidence)) {
    throw new Error(
      "Restore requires successful full-export evidence for documents, drafts, and assets.",
    );
  }
  const sourceArchiveSha256 = await sha256(source);
  if (sourceArchiveSha256 !== sourceEvidence.archiveSha256) {
    throw new Error("The export archive does not match its SHA-256 evidence.");
  }
  const archiveCounts = await inspectExportArchive(source);
  if (
    archiveCounts.assetFiles !== sourceEvidence.counts.assetFiles ||
    archiveCounts.assetReferences !== sourceEvidence.counts.assetReferences ||
    archiveCounts.documents !== sourceEvidence.counts.documents ||
    archiveCounts.drafts !== sourceEvidence.counts.drafts
  ) {
    throw new Error("The export archive does not match its coverage evidence.");
  }
  const command = [
    sanityBinary,
    "datasets",
    "import",
    source,
    "--dataset",
    targetDataset,
    "--project-id",
    targetProjectId,
    "--replace",
  ] as const;
  const plan = {
    archiveCounts,
    command,
    evidence,
    evidenceDate,
    source,
    sourceArchiveSha256,
    targetDataset,
    targetProjectId,
  };
  if (dryRun) {
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    return;
  }

  await mkdir(dirname(evidence), { recursive: true });
  await runCommand(command);
  const result = {
    coverage: sourceEvidence.coverage,
    counts: archiveCounts,
    evidenceDate,
    restoredAt: new Date().toISOString(),
    sourceArchiveSha256,
    sourceDataset: sourceEvidence.dataset,
    sourceProjectId: sourceEvidence.projectId,
    status: "succeeded",
    targetDataset,
    targetProjectId,
  } as const;
  await writeFile(evidence, `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function main() {
  const { command, dryRun, values } = parseArguments(process.argv.slice(2));
  if (command === "export") {
    await exportDataset(values, dryRun);
    return;
  }
  await restoreDataset(values, dryRun);
}

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
