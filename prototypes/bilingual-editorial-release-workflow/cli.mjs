#!/usr/bin/env node

/**
 * PROTOTYPE — throwaway TUI shell around the pure workflow state model.
 */

import readline from "node:readline";
import {
  createInitialState,
  derive,
  transition,
} from "./model.mjs";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const actionByKey = {
  h: "FIX_PARITY",
  a: "FIX_ACCESSIBILITY",
  r: "INCLUDE_REFERENCE_CLOSURE",
  m: "FIX_ASSETS",
  p: "FIX_PRIVACY",
  v: "VALIDATE",
  1: "PREVIEW_EN",
  2: "PREVIEW_HR",
  x: "CAPTURE_EXPORT",
  u: "PUBLISH",
  d: "DEPLOY_SUCCESS",
  f: "DEPLOY_FAILURE",
  b: "ROLLBACK_PUBLIC",
  o: "RESTORE_CONTENT",
  n: "RESET",
};

const scenarios = {
  success: ["h", "a", "r", "m", "p", "v", "1", "2", "x", "u", "d"],
  "failed-deploy": [
    "h",
    "a",
    "r",
    "m",
    "p",
    "v",
    "1",
    "2",
    "x",
    "u",
    "f",
    "o",
    "d",
  ],
  "post-deploy-rollback": [
    "h",
    "a",
    "r",
    "m",
    "p",
    "v",
    "1",
    "2",
    "x",
    "u",
    "d",
    "b",
    "o",
    "d",
  ],
};

function mark(passed) {
  return passed ? "[✓]" : "[ ]";
}

function render(state, { clear = true } = {}) {
  const view = derive(state);
  if (clear && process.stdout.isTTY) console.clear();

  const lines = [
    `${BOLD}BILINGUAL PUBLICATION BATCH — THROWAWAY PROTOTYPE${RESET}`,
    `${DIM}Can one owner safely move a cross-document EN/HR change from draft to live?${RESET}`,
    "",
    `${BOLD}Batch${RESET}       ${state.batch.name}`,
    `${BOLD}Status${RESET}      ${state.batch.status}`,
    `${BOLD}Documents${RESET}   ${state.batch.documents.join(", ")}`,
    "",
    `${BOLD}Release gates${RESET}`,
    `  ${mark(state.checks.parity)} paired EN/HR factual coverage`,
    `  ${mark(state.checks.accessibility)} localized alt/caption/diagram descriptions`,
    `  ${mark(state.checks.references)} changed strong-reference closure`,
    `  ${mark(state.checks.assets)} image, PDF, and Mermaid asset checks`,
    `  ${mark(state.checks.privacy)} publish-safe content and metadata`,
    `  ${mark(view.validationCurrent)} current batch-wide validation`,
    `  ${mark(state.preview.enReviewed)} EN application preview reviewed`,
    `  ${mark(state.preview.hrReviewed)} HR application preview reviewed`,
    `  ${mark(view.rollbackReady)} pre-publication rollback bundle`,
    `  ${mark(view.exportRecoverable)} full export restore drill`,
    "",
    `${BOLD}Revisions${RESET}`,
    `  Draft candidate     ${state.revisions.draftCandidate}`,
    `  Sanity published   ${state.revisions.sanityPublished}`,
    `  Public application ${state.revisions.publicApplication}`,
    `  Deployment         ${state.deployment.status}${state.deployment.candidate ? ` → ${state.deployment.candidate}` : ""}`,
    `  In sync            ${view.contentMatchesPublic ? "yes" : "NO"}`,
    "",
    `${BOLD}Last event${RESET}  ${state.lastEvent}`,
    "",
    `${BOLD}Edit/fix${RESET}  [h] parity  [a] accessibility  [r] references  [m] assets  [p] privacy`,
    `${BOLD}Review${RESET}    [v] validate  [1] EN preview  [2] HR preview  [x] export/bundle`,
    `${BOLD}Release${RESET}   [u] publish  [d] deploy succeeds  [f] deploy fails`,
    `${BOLD}Recover${RESET}   [b] public rollback  [o] restore Sanity  [n] reset  [q] quit`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function applyKey(state, key) {
  const type = actionByKey[key];
  return type
    ? transition(state, { type })
    : {
        ...state,
        lastEvent: `BLOCKED — Unknown key: ${key}`,
      };
}

const scenarioFlag = process.argv.find((argument) =>
  argument.startsWith("--scenario"),
);

if (scenarioFlag) {
  const inlineName = scenarioFlag.split("=")[1];
  const positionalName =
    scenarioFlag === "--scenario"
      ? process.argv[process.argv.indexOf(scenarioFlag) + 1]
      : undefined;
  const scenarioName = inlineName ?? positionalName;
  const keys = scenarios[scenarioName];

  if (!keys) {
    process.stderr.write(
      `Unknown scenario. Choose: ${Object.keys(scenarios).join(", ")}\n`,
    );
    process.exitCode = 1;
  } else {
    let state = createInitialState();
    for (const key of keys) state = applyKey(state, key);
    render(state, { clear: false });
  }
} else {
  let state = createInitialState();
  render(state);

  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${BOLD}>${RESET} `,
  });

  input.prompt();
  input.on("line", (line) => {
    const key = line.trim().toLowerCase()[0];
    if (key === "q") {
      input.close();
      return;
    }
    state = applyKey(state, key);
    render(state);
    input.prompt();
  });
}

