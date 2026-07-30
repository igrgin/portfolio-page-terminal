import { spawnSync } from "node:child_process";
import { appendFile } from "node:fs/promises";

import {
  auditExitCode,
  collectAdvisories,
  distinctSeverityCounts,
  renderAuditSummary,
  validateAuditPayload,
} from "./dependency-audit-lib.mjs";

function annotation(level, title, message) {
  if (!process.env.GITHUB_ACTIONS) {
    return;
  }

  console.log(`::${level} title=${title}::${message}`);
}

function npmAudit() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmCommand,
    ["audit", "--json", "--package-lock-only"],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw result.error;
  }

  let audit;
  try {
    audit = JSON.parse(result.stdout);
  } catch {
    const detail = result.stderr.trim() || result.stdout.trim() || "No output";
    throw new Error(`npm audit did not return valid JSON: ${detail}`);
  }

  return validateAuditPayload(audit);
}

async function patchedVersions(advisories) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-dependency-audit",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const entries = await Promise.all(
    advisories
      .filter((advisory) => advisory.id.startsWith("GHSA-"))
      .map(async (advisory) => {
        try {
          const response = await fetch(
            `https://api.github.com/advisories/${advisory.id}`,
            { headers },
          );

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          const versions = data.vulnerabilities
            ?.filter(
              (candidate) =>
                candidate.package?.ecosystem === "npm" &&
                candidate.package?.name === advisory.packageName,
            )
            .map((vulnerability) => vulnerability.first_patched_version)
            .map((version) =>
              typeof version === "string" ? version : version?.identifier,
            )
            .filter(Boolean);
          const uniqueVersions = [...new Set(versions)].sort();
          return uniqueVersions.length > 0
            ? [advisory.id, uniqueVersions.join(" / ")]
            : null;
        } catch {
          return null;
        }
      }),
  );

  return new Map(entries.filter(Boolean));
}

async function main() {
  try {
    const audit = npmAudit();
    const advisories = collectAdvisories(audit);
    const availablePatches = await patchedVersions(advisories);
    const summary = renderAuditSummary(audit, advisories, availablePatches);
    const counts = distinctSeverityCounts(advisories);

    console.log(summary);

    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }

    if (counts.high > 0) {
      annotation(
        "warning",
        "Dependency security",
        `${counts.high} distinct high-severity advisories detected; review the job summary.`,
      );
    }

    if (counts.critical > 0) {
      annotation(
        "error",
        "Dependency security",
        `${counts.critical} distinct critical advisories detected; this check blocks.`,
      );
    }

    process.exitCode = auditExitCode(advisories);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    annotation("error", "Dependency security scan failed", message);
    console.error(`Dependency security scan failed: ${message}`);
    process.exitCode = 2;
  }
}

await main();
