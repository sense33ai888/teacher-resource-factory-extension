#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const packDir = process.argv[2];

if (!packDir) {
  console.error("Usage: validate-resource-pack.mjs <pack-dir>");
  process.exit(2);
}

const allowedQaStatuses = new Set(["pass", "partial", "fail"]);
const allowedSourceStatuses = new Set([
  "not_required",
  "missing",
  "source_notes_present",
  "claim_level_grounded",
]);
const allowedReviewStatuses = new Set([
  "pending_teacher_review",
  "approved_for_classroom",
  "revision_requested",
]);

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function hasFile(relativePath) {
  const fullPath = path.join(packDir, relativePath);
  return existsSync(fullPath) && statSync(fullPath).isFile() && statSync(fullPath).size > 0;
}

function artifactById(pack, id) {
  return (pack.artifacts || []).find((artifact) => artifact.artifact_id === id);
}

async function pdfPageCount(relativePath) {
  try {
    const { PDFDocument } = require("pdf-lib");
    const fullPath = path.join(packDir, relativePath);
    const pdf = await PDFDocument.load(await fs.readFile(fullPath));
    return pdf.getPageCount();
  } catch (error) {
    warn(`Could not inspect PDF ${relativePath}: ${error.message}`);
    return null;
  }
}

async function main() {
  const resourcePath = path.join(packDir, "resource_pack.json");
  if (!hasFile("resource_pack.json")) fail("Missing resource_pack.json");
  if (!hasFile("pack-manifest.md")) fail("Missing pack-manifest.md");
  if (failures.length) return report();

  const pack = JSON.parse(await fs.readFile(resourcePath, "utf8"));

  for (const field of ["pack_id", "topic", "year_level", "pack_shape"]) {
    if (!pack[field]) fail(`Missing required field ${field}`);
  }

  if (!pack.qa || !allowedQaStatuses.has(pack.qa.status)) {
    fail("qa.status missing or invalid");
  }

  if (pack.qa?.scope !== "automated_artifact_checks_only") {
    fail("qa.scope must be automated_artifact_checks_only");
  }

  if (!pack.source_grounding_status) {
    fail("Missing source_grounding_status");
  } else {
    const status = pack.source_grounding_status.status;
    if (!allowedSourceStatuses.has(status)) fail(`Invalid source_grounding_status.status: ${status}`);
  }

  if (!pack.classroom_review_status) {
    fail("Missing classroom_review_status");
  } else {
    const status = pack.classroom_review_status.status;
    if (!allowedReviewStatuses.has(status)) fail(`Invalid classroom_review_status.status: ${status}`);
  }

  const trustedSources = (pack.sources || []).filter((source) => source.source_type === "public_trusted" || source.source_type === "teacher_owned" || source.source_type === "school_owned");
  const aiGeneratedSources = (pack.sources || []).filter((source) => source.source_type === "ai_generated");
  const factualSafetyPass = (pack.qa?.checks || []).some((check) => check.name === "factual_safety" && check.status === "pass");

  if (aiGeneratedSources.length && trustedSources.length === 0) {
    fail("AI-generated factual content exists without trusted source grounding");
  }

  if (factualSafetyPass) {
    fail("Do not use factual_safety: pass; use source_grounding_status instead");
  }

  if (pack.source_grounding_status?.status === "missing" && trustedSources.length > 0) {
    fail("source_grounding_status is missing but trusted sources exist");
  }

  if (pack.source_grounding_status?.status !== "not_required" && !artifactById(pack, "source-notes")) {
    fail("source_grounding_status requires source-notes artifact");
  }

  if (pack.classroom_review_status?.status !== "approved_for_classroom" && pack.review_required === false) {
    fail("review_required cannot be false before classroom approval");
  }

  const artifactIds = new Set();
  const artifactPaths = new Set();
  for (const artifact of pack.artifacts || []) {
    if (!artifact.artifact_id) fail("Artifact missing artifact_id");
    if (!artifact.path) fail(`Artifact ${artifact.artifact_id || "(unknown)"} missing path`);
    if (artifact.path && !hasFile(artifact.path)) fail(`Artifact file missing or empty: ${artifact.path}`);
    if (artifact.artifact_id) {
      if (artifactIds.has(artifact.artifact_id)) fail(`Duplicate artifact_id: ${artifact.artifact_id}`);
      artifactIds.add(artifact.artifact_id);
    }
    if (artifact.path) {
      if (artifactPaths.has(artifact.path)) fail(`Duplicate artifact path: ${artifact.path}`);
      artifactPaths.add(artifact.path);
    }
  }

  const preview = artifactById(pack, "teacher-preview-index");
  if (!preview) fail("Missing teacher-preview-index artifact");
  if (preview && !hasFile(preview.path)) fail(`Teacher preview file missing: ${preview.path}`);

  const manifest = await fs.readFile(path.join(packDir, "pack-manifest.md"), "utf8");
  for (const section of ["Teacher Preview", "Rendered Files"]) {
    if (!manifest.includes(`## ${section}`)) warn(`Manifest missing section ${section}`);
  }

  for (const artifact of pack.artifacts || []) {
    if (artifact.path?.endsWith(".pdf") && hasFile(artifact.path)) {
      const count = await pdfPageCount(artifact.path);
      if (count !== null && count < 1) fail(`PDF has no pages: ${artifact.path}`);
    }
  }

  const game = (pack.artifacts || []).find((artifact) => artifact.type === "escape_quiz_game");
  if (game && hasFile(game.path)) {
    const html = await fs.readFile(path.join(packDir, game.path), "utf8");
    if (!html.includes("window.__teacherGameQuestions")) {
      fail("Escape quiz game is missing smoke-test question hook");
    }
  }

  report();
}

function report() {
  for (const warning of warnings) console.log(`WARN ${warning}`);
  for (const failure of failures) console.log(`FAIL ${failure}`);
  if (failures.length) {
    console.log(`RESULT FAIL (${failures.length} failures, ${warnings.length} warnings)`);
    process.exit(1);
  }
  console.log(`RESULT PASS (${warnings.length} warnings)`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
