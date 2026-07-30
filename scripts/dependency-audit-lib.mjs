const severityOrder = ["critical", "high", "moderate", "low", "info"];

function severityRank(severity) {
  const rank = severityOrder.indexOf(severity);
  return rank === -1 ? severityOrder.length : rank;
}

function advisoryId(url, source) {
  const match = url?.match(/\/(GHSA-[a-z0-9-]+)$/i);
  return match?.[1]?.toUpperCase() ?? `npm-${source}`;
}

function directPathsFrom(packageName, vulnerabilities, seen = new Set()) {
  if (seen.has(packageName)) {
    return [];
  }

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) {
    return [];
  }

  if (vulnerability.isDirect) {
    return [[packageName]];
  }

  const nextSeen = new Set(seen);
  nextSeen.add(packageName);

  return (vulnerability.effects ?? []).flatMap((parentName) =>
    directPathsFrom(parentName, vulnerabilities, nextSeen).map((path) => [
      ...path,
      packageName,
    ]),
  );
}

function formatFix(fixAvailable) {
  if (fixAvailable === true) {
    return "Compatible npm update";
  }

  if (!fixAvailable || typeof fixAvailable !== "object") {
    return "No npm fix";
  }

  const breaking = fixAvailable.isSemVerMajor ? " (breaking)" : "";
  return `${fixAvailable.name}@${fixAvailable.version}${breaking}`;
}

export function collectAdvisories(audit) {
  const vulnerabilities = audit.vulnerabilities ?? {};
  const advisories = new Map();

  for (const [affectedName, vulnerability] of Object.entries(vulnerabilities)) {
    for (const via of vulnerability.via ?? []) {
      if (!via || typeof via !== "object") {
        continue;
      }

      const id = advisoryId(via.url, via.source);
      const existing = advisories.get(id) ?? {
        id,
        title: via.title,
        url: via.url,
        severity: via.severity,
        packageName: via.name ?? via.dependency ?? affectedName,
        vulnerableRange: via.range,
        paths: new Set(),
        nodes: new Set(),
        fixes: new Set(),
      };

      existing.severity =
        severityRank(via.severity) < severityRank(existing.severity)
          ? via.severity
          : existing.severity;

      for (const path of directPathsFrom(affectedName, vulnerabilities)) {
        existing.paths.add(path.join(" → "));
      }

      for (const node of vulnerability.nodes ?? []) {
        existing.nodes.add(node);
      }

      existing.fixes.add(formatFix(vulnerability.fixAvailable));
      advisories.set(id, existing);
    }
  }

  return [...advisories.values()]
    .map((advisory) => ({
      ...advisory,
      paths: [...advisory.paths].sort(),
      nodes: [...advisory.nodes].sort(),
      fixes: [...advisory.fixes].sort(),
    }))
    .sort(
      (left, right) =>
        severityRank(left.severity) - severityRank(right.severity) ||
        left.packageName.localeCompare(right.packageName) ||
        left.id.localeCompare(right.id),
    );
}

export function validateAuditPayload(audit) {
  if (audit?.error) {
    const detail =
      audit.error.summary ??
      audit.error.detail ??
      audit.error.code ??
      "Unknown npm audit error";
    throw new Error(`npm audit failed: ${detail}`);
  }

  if (
    !audit ||
    typeof audit.vulnerabilities !== "object" ||
    typeof audit.metadata?.vulnerabilities !== "object"
  ) {
    throw new Error("npm audit returned an incomplete vulnerability report");
  }

  return audit;
}

export function distinctSeverityCounts(advisories) {
  const counts = Object.fromEntries(
    severityOrder.map((severity) => [severity, 0]),
  );

  for (const advisory of advisories) {
    if (advisory.severity in counts) {
      counts[advisory.severity] += 1;
    }
  }

  return counts;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function displayPath(advisory) {
  if (advisory.paths.length > 0) {
    return advisory.paths.map(escapeTable).join("<br>");
  }

  return advisory.nodes.map(escapeTable).join("<br>") || "Unknown";
}

export function renderAuditSummary(
  audit,
  advisories,
  patchedVersions = new Map(),
) {
  const distinctCounts = distinctSeverityCounts(advisories);
  const affectedCounts = audit.metadata?.vulnerabilities ?? {};
  const affectedTotal =
    affectedCounts.total ??
    Object.values(audit.vulnerabilities ?? {}).filter(Boolean).length;
  const countSummary = severityOrder
    .filter((severity) => distinctCounts[severity] > 0 || severity === "critical")
    .map((severity) => `${distinctCounts[severity]} ${severity}`)
    .join(", ");

  const lines = [
    "## Dependency security",
    "",
    `**${advisories.length} distinct advisories** across **${affectedTotal} affected dependency entries** (${countSummary}).`,
    "",
    "Policy: critical findings block; high findings warn; moderate and low findings remain visible.",
    "",
  ];

  if (advisories.length === 0) {
    lines.push("No known dependency advisories were reported.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "| Severity | Advisory | Vulnerable dependency | Patched versions | Dependency path | npm remediation |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  for (const advisory of advisories) {
    const advisoryLink = advisory.url
      ? `[${advisory.id}](${advisory.url})`
      : advisory.id;
    const patchedVersion =
      patchedVersions.get(advisory.id) ?? "See advisory";
    const dependency = `${advisory.packageName} ${advisory.vulnerableRange}`;
    const fixes = advisory.fixes.join("<br>");

    lines.push(
      `| ${escapeTable(advisory.severity)} | ${advisoryLink}: ${escapeTable(advisory.title)} | ${escapeTable(dependency)} | ${escapeTable(patchedVersion)} | ${displayPath(advisory)} | ${escapeTable(fixes)} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function auditExitCode(advisories) {
  return advisories.some((advisory) => advisory.severity === "critical")
    ? 1
    : 0;
}
