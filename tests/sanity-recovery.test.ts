import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const tsx = resolve(root, "node_modules/.bin/tsx");
const recoveryScript = resolve(root, "scripts/sanity-recovery.ts");

async function runRecoveryCli(arguments_: readonly string[]) {
  return new Promise<Readonly<{ code: number | null; stderr: string; stdout: string }>>(
    (resolveRun) => {
      const child = spawn(tsx, [recoveryScript, ...arguments_], {
        cwd: root,
        env: { ...process.env },
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
      child.on("close", (code) => {
        resolveRun({ code, stderr, stdout });
      });
    },
  );
}

test("export CLI plans a dated full export with documents, drafts, and assets while excluding the rollback dataset", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-export-"));
  try {
    const output = join(directory, "sanity-2026-07-31.tar.gz");
    const evidence = join(directory, "sanity-2026-07-31.export.json");
    const result = await runRecoveryCli([
      "export",
      "--project-id",
      "portfolio",
      "--dataset",
      "production",
      "--rollback-dataset",
      "publication-recovery-private",
      "--output",
      output,
      "--evidence",
      evidence,
      "--date",
      "2026-07-31",
      "--dry-run",
    ]);

    assert.equal(result.code, 0, result.stderr);
    const plan = JSON.parse(result.stdout) as {
      command: readonly string[];
      coverage: Record<string, boolean>;
      evidence: string;
      output: string;
    };
    assert.equal(plan.output, output);
    assert.equal(plan.evidence, evidence);
    assert.deepEqual(plan.coverage, {
      assets: true,
      documents: true,
      drafts: true,
      privateRollbackDataset: false,
    });
    assert.deepEqual(plan.command.slice(1), [
      "datasets",
      "export",
      "production",
      output,
      "--project-id",
      "portfolio",
      "--overwrite",
      "--mode",
      "stream",
    ]);
    assert.doesNotMatch(plan.command.join(" "), /--no-assets|--no-drafts/);

    const rejected = await runRecoveryCli([
      "export",
      "--project-id",
      "portfolio",
      "--dataset",
      "production",
      "--rollback-dataset",
      "production",
      "--output",
      output,
      "--evidence",
      evidence,
      "--date",
      "2026-07-31",
      "--dry-run",
    ]);
    assert.notEqual(rejected.code, 0);
    assert.match(rejected.stderr, /rollback dataset must never be exported/i);

    const unsafePaths = await runRecoveryCli([
      "export",
      "--project-id",
      "portfolio",
      "--dataset",
      "production",
      "--rollback-dataset",
      "publication-recovery-private",
      "--output",
      output,
      "--evidence",
      output,
      "--date",
      "2026-02-31",
      "--dry-run",
    ]);
    assert.notEqual(unsafePaths.code, 0);
    assert.match(unsafePaths.stderr, /real YYYY-MM-DD date|different paths/i);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("restore CLI accepts only a verified export and a different non-production project", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-restore-"));
  try {
    const source = join(directory, "sanity-2026-07-31.tar.gz");
    const sourceBytes = Buffer.from("full Sanity export fixture");
    await writeFile(source, sourceBytes);
    const exportEvidence = join(directory, "sanity-2026-07-31.export.json");
    await writeFile(
      exportEvidence,
      JSON.stringify({
        archiveSha256: createHash("sha256").update(sourceBytes).digest("hex"),
        coverage: {
          assets: true,
          documents: true,
          drafts: true,
          privateRollbackDataset: false,
        },
        dataset: "production",
        exportedAt: "2026-07-31T06:00:00.000Z",
        projectId: "portfolio-production",
        status: "succeeded",
      }),
    );
    const restoreEvidence = join(
      directory,
      "sanity-2026-07-31.restore.json",
    );
    const result = await runRecoveryCli([
      "restore",
      "--source",
      source,
      "--export-evidence",
      exportEvidence,
      "--production-project-id",
      "portfolio-production",
      "--target-project-id",
      "portfolio-recovery-test",
      "--target-dataset",
      "restore-2026-07-31",
      "--evidence",
      restoreEvidence,
      "--date",
      "2026-07-31",
      "--dry-run",
    ]);

    assert.equal(result.code, 0, result.stderr);
    const plan = JSON.parse(result.stdout) as {
      command: readonly string[];
      sourceArchiveSha256: string;
      targetProjectId: string;
    };
    assert.equal(plan.targetProjectId, "portfolio-recovery-test");
    assert.equal(
      plan.sourceArchiveSha256,
      createHash("sha256").update(sourceBytes).digest("hex"),
    );
    assert.deepEqual(plan.command.slice(1), [
      "datasets",
      "import",
      source,
      "--dataset",
      "restore-2026-07-31",
      "--project-id",
      "portfolio-recovery-test",
      "--replace",
    ]);

    const rejected = await runRecoveryCli([
      "restore",
      "--source",
      source,
      "--export-evidence",
      exportEvidence,
      "--production-project-id",
      "portfolio-production",
      "--target-project-id",
      "portfolio-production",
      "--target-dataset",
      "restore-2026-07-31",
      "--evidence",
      restoreEvidence,
      "--date",
      "2026-07-31",
      "--dry-run",
    ]);
    assert.notEqual(rejected.code, 0);
    assert.match(rejected.stderr, /different non-production Sanity project/i);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("scheduled export automation encrypts the complete backup before uploading it off-platform", async () => {
  const workflow = await readFile(
    resolve(root, ".github/workflows/sanity-export.yml"),
    "utf8",
  );

  assert.match(workflow, /schedule:\s*\n\s*-\s*cron:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /npm run content:export/);
  assert.match(workflow, /gpg[\s\S]*--cipher-algo AES256/);
  assert.match(
    workflow,
    /uses:\s*actions\/upload-artifact@[a-f0-9]{40}\s*#\s*v\d/u,
  );
  assert.match(workflow, /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/[^\n]+\.gpg/u);
  assert.doesNotMatch(workflow, /path:\s*[^\n]*\.tar\.gz\s*$/mu);
});
