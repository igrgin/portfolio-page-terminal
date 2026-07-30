import assert from "node:assert/strict";
import test from "node:test";

import {
  auditExitCode,
  collectAdvisories,
  distinctSeverityCounts,
  renderAuditSummary,
  validateAuditPayload,
} from "../scripts/dependency-audit-lib.mjs";

const audit = {
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 0,
      high: 3,
      critical: 0,
      total: 3,
    },
  },
  vulnerabilities: {
    framework: {
      name: "framework",
      severity: "high",
      isDirect: true,
      via: ["plugin"],
      effects: [],
      nodes: ["node_modules/framework"],
      fixAvailable: false,
    },
    plugin: {
      name: "plugin",
      severity: "high",
      isDirect: false,
      via: ["parser"],
      effects: ["framework"],
      nodes: ["node_modules/plugin"],
      fixAvailable: true,
    },
    parser: {
      name: "parser",
      severity: "high",
      isDirect: false,
      via: [
        {
          source: 123,
          name: "parser",
          title: "Parser can exhaust memory",
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
          severity: "high",
          range: "<2.0.0",
        },
        {
          source: 123,
          name: "parser",
          title: "Parser can exhaust memory",
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
          severity: "high",
          range: "<2.0.0",
        },
      ],
      effects: ["plugin"],
      nodes: ["node_modules/plugin/node_modules/parser"],
      fixAvailable: {
        name: "framework",
        version: "1.0.0",
        isSemVerMajor: true,
      },
    },
  },
};

test("dependency audit deduplicates advisories and traces direct dependency paths", () => {
  const advisories = collectAdvisories(audit);

  assert.equal(advisories.length, 1);
  assert.equal(advisories[0].id, "GHSA-AAAA-BBBB-CCCC");
  assert.deepEqual(advisories[0].paths, ["framework → plugin → parser"]);
  assert.deepEqual(advisories[0].fixes, ["framework@1.0.0 (breaking)"]);
  assert.deepEqual(distinctSeverityCounts(advisories), {
    critical: 0,
    high: 1,
    moderate: 0,
    low: 0,
    info: 0,
  });
});

test("dependency audit summary distinguishes advisories from affected entries", () => {
  const advisories = collectAdvisories(audit);
  const summary = renderAuditSummary(
    audit,
    advisories,
    new Map([["GHSA-AAAA-BBBB-CCCC", "2.0.0"]]),
  );

  assert.match(summary, /1 distinct advisories/);
  assert.match(summary, /3 affected dependency entries/);
  assert.match(summary, /GHSA-AAAA-BBBB-CCCC/);
  assert.match(summary, /Patched versions/);
  assert.match(summary, /2\.0\.0/);
  assert.match(summary, /framework → plugin → parser/);
});

test("dependency audit blocks only critical advisories", () => {
  const highAdvisories = collectAdvisories(audit);
  assert.equal(auditExitCode(highAdvisories), 0);

  assert.equal(
    auditExitCode([
      ...highAdvisories,
      {
        ...highAdvisories[0],
        id: "GHSA-DDDD-EEEE-FFFF",
        severity: "critical",
      },
    ]),
    1,
  );
});

test("dependency audit rejects registry errors and incomplete reports", () => {
  assert.throws(
    () =>
      validateAuditPayload({
        error: { summary: "registry unavailable" },
      }),
    /npm audit failed: registry unavailable/,
  );
  assert.throws(
    () => validateAuditPayload({ vulnerabilities: {} }),
    /incomplete vulnerability report/,
  );
  assert.equal(validateAuditPayload(audit), audit);
});
