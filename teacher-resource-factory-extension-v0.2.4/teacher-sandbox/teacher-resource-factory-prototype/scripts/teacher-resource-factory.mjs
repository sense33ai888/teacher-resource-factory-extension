#!/usr/bin/env node
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { executeDiagramLane as runDiagramLane } from "../lanes/educational-diagram/index.mjs";
import { executeLessonSlideLane as runLessonSlideLane } from "../lanes/lesson-slide/index.mjs";
import { executeExitTicketLane as runExitTicketLane, executeHomeworkLane as runHomeworkLane, executeWorksheetLane as runWorksheetLane } from "../lanes/worksheet/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(here, "..");
const sandboxRoot = path.resolve(factoryRoot, "..");
const workspaceRoot = path.resolve(sandboxRoot, "..");
const slideTemplateRoot = path.join(sandboxRoot, "lesson-slide-template-system-prototype");
const primaryNode = process.env.OPENCLAW_NODE_BIN || process.execPath;
const runtimeNodeModules = process.env.OPENCLAW_NODE_MODULES || path.resolve(path.dirname(primaryNode), "..", "node_modules");
const playwrightPath = resolvePlaywrightPath();
const publisherScript = process.env.TEACHER_VAULT_PUBLISHER_SCRIPT || path.join(workspaceRoot, "owned-skills", "skills", "teacher-vault-artifact-publisher", "scripts", "publish-teacher-artifact.mjs");
const teacherVaultConfig = resolveTeacherVaultConfig();
const resourcePackDataRoot = process.env.TEACHER_RESOURCE_PACK_DATA_ROOT || path.join(workspaceRoot, "owned-skills", "skills", "teacher-resource-pack-generator", "data");
const today = localDateStamp();
const factoryVersion = "0.2.4";
const topicPlanRegistry = await loadTopicPlanRegistry();
const laneContext = {
  addArtifact,
  documentHtml,
  escapeHtml,
  htmlToPdf,
  primaryNode,
  run,
  slideTemplateRoot,
  slug
};

const args = parseArgs(process.argv.slice(2));
const requestInput = await loadRequest(args);
const intake = normalizeIntake(requestInput);
const sourceAssetPlan = planSourcesAndAssets(intake);
const router = routeResources(intake, sourceAssetPlan);

const packId = `${slug(intake.year_level)}-${slug(intake.topic)}-factory-pack-${today}`;
const packDir = path.join(factoryRoot, "outputs", packId);
await fs.mkdir(packDir, { recursive: true });
await fs.mkdir(path.join(packDir, "slides"), { recursive: true });
await fs.mkdir(path.join(packDir, "worksheets"), { recursive: true });
await fs.mkdir(path.join(packDir, "homework"), { recursive: true });
await fs.mkdir(path.join(packDir, "exit-tickets"), { recursive: true });
await fs.mkdir(path.join(packDir, "diagrams"), { recursive: true });
await fs.mkdir(path.join(packDir, "answer-keys"), { recursive: true });
await fs.mkdir(path.join(packDir, "teacher-notes"), { recursive: true });
await fs.mkdir(path.join(packDir, "source-notes"), { recursive: true });
await fs.mkdir(path.join(packDir, "preview"), { recursive: true });

const artifacts = [];
await writeJson(path.join(packDir, "intake.json"), intake);
await writeJson(path.join(packDir, "router.json"), router);
await writeJson(path.join(packDir, "source-asset-plan.json"), sourceAssetPlan);

if (router.lanes.includes("lesson_slide")) {
  await runLessonSlideLane({ intake, plan: sourceAssetPlan, packDir, artifacts, context: laneContext });
}
if (router.lanes.includes("educational_diagram")) {
  await runDiagramLane({ intake, plan: sourceAssetPlan, packDir, artifacts, context: laneContext });
}
if (router.lanes.includes("worksheet")) {
  await runWorksheetLane({ intake, plan: sourceAssetPlan, packDir, artifacts, context: laneContext });
}
if (router.lanes.includes("homework")) {
  await runHomeworkLane({ intake, plan: sourceAssetPlan, packDir, artifacts, context: laneContext });
}
if (router.lanes.includes("exit_ticket")) {
  await runExitTicketLane({ intake, plan: sourceAssetPlan, packDir, artifacts, context: laneContext });
}
if (router.lanes.includes("answer_key")) {
  await executeAnswerKeyLane(intake, sourceAssetPlan, packDir, artifacts);
}
if (router.lanes.includes("teacher_notes")) {
  await executeTeacherNotesLane(intake, router, sourceAssetPlan, packDir, artifacts);
}
if (router.lanes.includes("source_notes")) {
  await executeSourceNotesLane(intake, sourceAssetPlan, packDir, artifacts);
}

await writePackManifest(intake, router, sourceAssetPlan, packDir, artifacts);
await writeResourcePack(intake, router, sourceAssetPlan, packDir, artifacts);
await writePreviewIndex(intake, router, packDir, artifacts);

const qa = await verifyPack(packDir, artifacts, intake, router, sourceAssetPlan);
const publishResult = qa.pass
  ? publishPack(packDir, intake)
  : { status: null, stdout: "", stderr: "Skipped publish because automated QA did not pass." };
const runPass = qa.pass && publishResult.status === 0;
await writeJson(path.join(packDir, "factory-run-report.json"), {
  status: runPass ? "pass" : "partial",
  factory_version: factoryVersion,
  pack_id: packId,
  pack_dir: packDir,
  intake,
  router,
  source_asset_plan: sourceAssetPlan,
  artifact_count: artifacts.length,
  qa,
  publish_result: publishResult,
  created_at: new Date().toISOString()
});

console.log(JSON.stringify({
  status: runPass ? "factory_pack_created" : "factory_pack_partial",
  pack_id: packId,
  pack_dir: packDir,
  preview: path.join(packDir, "preview", "index.html"),
  artifacts: artifacts.length,
  published: publishResult.status === 0,
  qa
}, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function resolveTeacherVaultConfig() {
  if (process.env.TEACHER_VAULT_CONFIG) {
    return path.resolve(process.env.TEACHER_VAULT_CONFIG);
  }

  const candidates = [
    path.join(sandboxRoot, "TEACHER-VAULT.json"),
    path.join(workspaceRoot, "TEACHER-VAULT.json"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found) return found;

  throw new Error(`TEACHER-VAULT.json not found. Checked: ${candidates.join(", ")}`);
}

function resolvePlaywrightPath() {
  const candidates = [
    process.env.OPENCLAW_PLAYWRIGHT_PATH,
    path.join(runtimeNodeModules, "playwright", "index.mjs"),
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs")
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  return found || path.join(runtimeNodeModules, "playwright", "index.mjs");
}

async function loadRequest(args) {
  if (args.input) return JSON.parse(await fs.readFile(path.resolve(args.input), "utf8"));
  if (args.request) return { raw_teacher_request: args.request, resource_request: "auto" };
  throw new Error("Usage: teacher-resource-factory.mjs --request <teacher request> OR --input <request.json>");
}

function normalizeIntake(input) {
  const raw = String(input.raw_teacher_request || "");
  const yearMatch = raw.match(/\bYear\s+(\d+)\b/i);
  const knownTopic = detectTopic(raw, input.topic);
  const topic = input.topic || knownTopic || extractTopicFromPrompt(raw) || "Untitled Topic";
  const yearLevel = input.year_level || (yearMatch ? `Year ${yearMatch[1]}` : "Year 5");
  const subject = input.subject || inferSubject(topic);
  const parsedResourceRequest = input.resource_request && input.resource_request !== "auto"
    ? input.resource_request
    : parseResourceRequest(raw);
  const assumptions = [
    ...(input.assumptions || []),
    "Factory v0.2.4 used deterministic templates and trusted/public source notes.",
    "Teacher should review final classroom fit before use."
  ];
  if (!input.duration_minutes) assumptions.push("Duration assumed to be 30 minutes.");
  if (!input.resource_request || input.resource_request === "auto") {
    assumptions.push(Array.isArray(parsedResourceRequest)
      ? `Resource request inferred from prompt: ${parsedResourceRequest.join(", ")}.`
      : "Resource request auto-routed to the topic's default pack policy.");
  }

  return {
    raw_teacher_request: raw || `Make a ${yearLevel} ${topic} lesson pack`,
    topic,
    year_level: yearLevel,
    subject,
    duration_minutes: input.duration_minutes || 30,
    teaching_goal: input.teaching_goal || defaultGoal(topic),
    student_level: input.student_level || "mixed",
    difficulty: input.difficulty || "core",
    resource_request: parsedResourceRequest,
    image_policy: input.image_policy || "trusted_public_sources_first",
    source_policy: input.source_policy || "source_grounded_required",
    output_format: input.output_format || "editable_html_and_pdf",
    assumptions
  };
}

function detectTopic(raw, explicitTopic) {
  if (explicitTopic) return explicitTopic;
  const matchedPlan = findTopicPlanByText(raw);
  if (matchedPlan) return matchedPlan.canonical_topic;
  const aboutMatch = raw.match(/\babout\s+([^.,;:\n]+)/i);
  if (aboutMatch) return titleCase(aboutMatch[1].replace(/\blesson pack\b|\blesson\b|\bslides?\b/gi, "").trim());
  return null;
}

function extractTopicFromPrompt(raw) {
  const withoutYear = String(raw || "")
    .replace(/\b(make|create|generate|build|prepare|please)\b/gi, " ")
    .replace(/\b(a|an|the|for|about)\b/gi, " ")
    .replace(/\bYear\s+\d+\b/gi, " ")
    .replace(/\b(worksheet|worksheets|homework|exit ticket|exit tickets|diagram|diagrams|slide|slides|lesson|pack|activity|answer key|teacher notes|source notes)\b/gi, " ")
    .replace(/\band\b/gi, " ")
    .replace(/[^\p{Letter}\p{Number}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return withoutYear ? titleCase(withoutYear) : null;
}

function inferSubject(topic) {
  const plan = findTopicPlan(topic);
  if (plan?.subject) return plan.subject;
  return "general";
}

function defaultGoal(topic) {
  const plan = findTopicPlan(topic);
  if (plan?.default_goal) return plan.default_goal;
  return `Students understand the core ideas of ${topic}.`;
}

function parseResourceRequest(raw) {
  const text = String(raw || "").toLowerCase();
  const lanes = [];
  const add = (lane) => {
    if (!lanes.includes(lane)) lanes.push(lane);
  };

  if (/\b(slide|slides|slideshow|deck|lesson)\b/.test(text)) add("lesson_slide");
  if (/\b(diagram|diagrams|poster|anchor chart|visual)\b/.test(text)) add("educational_diagram");
  if (/\b(worksheet|worksheets|activity sheet|practice sheet)\b/.test(text)) add("worksheet");
  if (/\b(exit ticket|exit tickets|exit slip|exit slips|exit card|exit cards|quick check|quick checks|plenary check)\b/.test(text)) add("exit_ticket");
  if (/\b(homework|home learning)\b/.test(text)) add("homework");
  if (/\b(answer key|answers|marking guide)\b/.test(text)) add("answer_key");
  if (/\bteacher notes?\b/.test(text)) add("teacher_notes");
  if (/\bsource notes?|sources?\b/.test(text)) add("source_notes");

  if (lanes.length === 0) return "auto";
  if ((lanes.includes("worksheet") || lanes.includes("homework") || lanes.includes("exit_ticket")) && !lanes.includes("answer_key")) add("answer_key");
  if (lanes.includes("lesson_slide") && !lanes.includes("teacher_notes")) add("teacher_notes");
  if (!lanes.includes("source_notes")) add("source_notes");
  return lanes;
}

function routeResources(intake, sourceAssetPlan) {
  const requested = intake.resource_request;
  const lessonSlideTemplate = sourceAssetPlan.lesson_slide_template_lane || "photo_led_lesson_deck_v1";
  const lanes = Array.isArray(requested)
    ? requested.map(normalizeLane)
    : sourceAssetPlan.output_bundle_policy?.default_lanes || ["lesson_slide", "educational_diagram", "worksheet", "homework", "answer_key", "teacher_notes", "source_notes"];
  if (lanes.includes("lesson_slide") && !sourceAssetPlan.fixture_path) {
    throw new Error(`No lesson slide fixture is configured for topic: ${intake.topic}`);
  }
  return {
    selected_pack_type: lanes.includes("educational_diagram") ? "lesson_pack_visual" : "lesson_pack_core",
    lanes,
    reason: Array.isArray(requested)
      ? "Factory v0.2.4 constrained output lanes from the teacher's resource words."
      : "Factory v0.2.4 used the topic plan's default lane policy.",
    routing_reasoning: sourceAssetPlan.routing_reason || "No topic-specific routing reason was provided; default routing was used.",
    template_system: {
      lesson_slide: lessonSlideTemplate,
      worksheet: "print_first_worksheet_v0",
      educational_diagram: "simple_svg_diagram_v0",
      homework: "print_first_homework_v0",
      exit_ticket: "print_first_exit_ticket_v0"
    }
  };
}

function normalizeLane(value) {
  const normalized = slug(value).replaceAll("-", "_");
  if (normalized === "slides" || normalized === "lesson_slides") return "lesson_slide";
  if (normalized === "diagram") return "educational_diagram";
  if (normalized === "answer_keys") return "answer_key";
  return normalized;
}

function planSourcesAndAssets(intake) {
  const plan = findTopicPlan(intake.topic);
  if (!plan) {
    throw new Error(`Unsupported topic: ${intake.topic}. No topic plan matched the teacher request; refusing to fall back to unrelated content.`);
  }
  return expandTopicPlan(plan);
}

async function executeAnswerKeyLane(intake, plan, packDir, artifacts) {
  const md = `# ${intake.topic} Answer Key

${plan.worksheet_questions.map(([q, a], index) => `${index + 1}. ${q}\n   - ${a}`).join("\n\n")}

## Marking Notes

- Accept equivalent wording where the student shows the same idea.
- Open response questions should be checked by the teacher.
`;
  const mdPath = path.join(packDir, "answer-keys", `${slug(intake.topic)}-answer-key.md`);
  const htmlPath = path.join(packDir, "answer-keys", `${slug(intake.topic)}-answer-key.html`);
  const pdfPath = path.join(packDir, "answer-keys", `${slug(intake.topic)}-answer-key.pdf`);
  await fs.writeFile(mdPath, md, "utf8");
  await fs.writeFile(htmlPath, documentHtml(`${intake.topic} Answer Key`, markdownLite(md), "document"), "utf8");
  await htmlToPdf(htmlPath, pdfPath, "8.27in", "11.69in");
  addArtifact(artifacts, "answer_key_md", "answer-key", mdPath, packDir);
  addArtifact(artifacts, "answer_key_pdf", "answer-key", pdfPath, packDir);
}

async function executeTeacherNotesLane(intake, router, plan, packDir, artifacts) {
  const md = `# ${intake.topic} Teacher Notes

## Overview

- Year level: ${intake.year_level}
- Subject: ${intake.subject}
- Duration: ${intake.duration_minutes} minutes
- Goal: ${intake.teaching_goal}
- Routing: ${plan.routing_reason || "Default routing used."}

## Suggested Flow

1. Open the lesson slides and introduce the learning goal.
2. Use the diagram as the visual anchor.
3. Complete the worksheet in class.
4. Assign the homework sheet for independent consolidation.
5. Use the answer key for review.

## Source / Review Status

- Source grounding: ${plan.source_grounding_status}
- Classroom review: ${plan.classroom_review_status}

## Review Notes

${plan.review_notes.map((note) => `- ${note}`).join("\n")}

## Factory Lanes Used

${router.lanes.map((lane) => `- ${lane}`).join("\n")}
`;
  const mdPath = path.join(packDir, "teacher-notes", `${slug(intake.topic)}-teacher-notes.md`);
  const htmlPath = path.join(packDir, "teacher-notes", `${slug(intake.topic)}-teacher-notes.html`);
  const pdfPath = path.join(packDir, "teacher-notes", `${slug(intake.topic)}-teacher-notes.pdf`);
  await fs.writeFile(mdPath, md, "utf8");
  await fs.writeFile(htmlPath, documentHtml(`${intake.topic} Teacher Notes`, markdownLite(md), "document"), "utf8");
  await htmlToPdf(htmlPath, pdfPath, "8.27in", "11.69in");
  addArtifact(artifacts, "teacher_notes_md", "teacher-notes", mdPath, packDir);
  addArtifact(artifacts, "teacher_notes_pdf", "teacher-notes", pdfPath, packDir);
}

async function executeSourceNotesLane(intake, plan, packDir, artifacts) {
  const md = `# ${intake.topic} Source Notes

Generated: ${today}

## Source Status

- Source grounding: ${plan.source_grounding_status}
- Classroom review: ${plan.classroom_review_status}
- Asset policy: ${plan.asset_policy}
- Routing: ${plan.routing_reason || "Default routing used."}

## Sources

${plan.sources.map(([label, url]) => `- ${label}: ${url}`).join("\n")}

## Review Notes

${plan.review_notes.map((note) => `- ${note}`).join("\n")}
`;
  const mdPath = path.join(packDir, "source-notes", `${slug(intake.topic)}-source-notes.md`);
  await fs.writeFile(mdPath, md, "utf8");
  addArtifact(artifacts, "source_notes_md", "source-notes", mdPath, packDir);
}

function documentHtml(title, body, kind) {
  const worksheetCss = kind === "worksheet" ? ".meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:18px 0 22px}.intro{font-size:18px}.vocab{background:#f3f7f5;border:1px solid #d7dfdc;padding:14px 16px;margin:18px 0}.q{break-inside:avoid;margin:18px 0 24px;font-size:16px}.line{height:34px;border-bottom:1px solid #9aa7b3}.line.short{width:72%}.reflect{margin-top:28px}" : "";
  const labellingCss = kind === "labelling" ? ".meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0 14px}.intro{font-size:16px}.labelling-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;align-items:start}.blank-diagram svg{width:100%;height:auto;border:1px solid #d7dfdc;background:#f8fbfb}.answer-lines{border:1px solid #d7dfdc;padding:14px 16px}.label-line{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:end;margin:17px 0}.label-line span{height:28px;border-bottom:1px solid #9aa7b3}.vocab{background:#f3f7f5;border:1px solid #d7dfdc;padding:12px 14px;margin-top:16px}" : "";
  return `<!doctype html>
<html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#e9edef;color:#202326;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{width:min(8.27in,calc(100% - 32px));min-height:11.69in;margin:24px auto;padding:.62in .68in;background:#fffefb;border:1px solid #d7dfdc}h1{font-size:34px;line-height:1.05;margin:0 0 18px}h2{font-size:20px;margin:22px 0 8px}p,li{font-size:15px;line-height:1.45}.diagram-wrap svg{width:100%;height:auto;border:1px solid #d7dfdc}.document h1{font-size:30px}.document p,.document li{font-size:15px}.document ul{padding-left:22px}@page{size:A4;margin:0}@media print{body{background:white}.page{width:8.27in;min-height:11.69in;margin:0;border:0;break-after:page}}${worksheetCss}${labellingCss}
</style></head><body><main class="page ${kind}">${body}</main></body></html>`;
}

function markdownLite(md) {
  return md
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith("# ")) return `<h1>${escapeHtml(block.slice(2))}</h1>`;
      if (block.startsWith("## ")) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
      if (block.includes("\n- ")) {
        const lines = block.split("\n");
        return lines.map((line) => line.startsWith("- ") ? `<li>${escapeHtml(line.slice(2))}</li>` : `<p>${escapeHtml(line)}</p>`).join("").replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
      }
      return `<p>${escapeHtml(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("\n");
}

async function writePackManifest(intake, router, plan, packDir, artifacts) {
  const md = `# ${intake.topic} Resource Pack

Generated: ${today}

## Overview

- Year level: ${intake.year_level}
- Subject: ${intake.subject}
- Pack type: ${router.selected_pack_type}
- Source grounding: ${plan.source_grounding_status}
- Classroom review: ${plan.classroom_review_status}
- Routing: ${plan.routing_reason || "Default routing used."}

## Teacher Entry Point

Open \`preview/index.html\` to see all artifacts.

## Artifacts

${artifacts.map((artifact) => `- ${artifact.artifact_id}: \`${artifact.path}\``).join("\n")}

## Assumptions

${intake.assumptions.map((assumption) => `- ${assumption}`).join("\n")}
`;
  const manifestPath = path.join(packDir, "pack-manifest.md");
  await fs.writeFile(manifestPath, md, "utf8");
  addArtifact(artifacts, "pack_manifest", "manifest", manifestPath, packDir);
}

async function writeResourcePack(intake, router, plan, packDir, artifacts) {
  const pack = {
    factory_version: factoryVersion,
    pack_id: path.basename(packDir),
    topic: intake.topic,
    year_level: intake.year_level,
    subject: intake.subject,
    pack_type: router.selected_pack_type,
    lanes: router.lanes,
    source_grounding_status: plan.source_grounding_status,
    classroom_review_status: plan.classroom_review_status,
    routing_reason: plan.routing_reason || null,
    assumptions: intake.assumptions,
    artifacts: artifacts.map((artifact) => ({
      artifact_id: artifact.artifact_id,
      type: artifact.type,
      path: artifact.path,
      status: "ready"
    })),
    qa: {
      status: "automated_pass",
      source_grounding_status: plan.source_grounding_status,
      classroom_review_status: plan.classroom_review_status
    }
  };
  await writeJson(path.join(packDir, "resource_pack.json"), pack);
}

async function writePreviewIndex(intake, router, packDir, artifacts) {
  const links = artifacts
    .filter((artifact) => !artifact.artifact_id.includes("preview_index"))
    .map((artifact) => `<li><a href="../${artifact.path}">${escapeHtml(artifact.artifact_id)}</a> <span>${escapeHtml(artifact.type)}</span></li>`)
    .join("");
  const html = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(intake.topic)} Teacher Preview</title>
<style>body{margin:0;background:#eef2f5;color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:980px;margin:0 auto;padding:48px 28px}h1{font-size:42px;margin:0 0 10px}.meta{color:#5b6776;margin-bottom:28px}ul{list-style:none;padding:0;display:grid;gap:12px}li{background:white;border:1px solid #d9e1e7;padding:16px 18px;display:flex;justify-content:space-between;gap:18px}a{color:#0f5c75;text-decoration:none;font-weight:800}span{color:#64748b}</style></head><body><main class="wrap"><h1>${escapeHtml(intake.topic)} Resource Pack</h1><div class="meta">${escapeHtml(intake.year_level)} · ${escapeHtml(router.selected_pack_type)} · Teacher Resource Factory v0.2</div><ul>${links}</ul></main></body></html>`;
  const previewPath = path.join(packDir, "preview", "index.html");
  await fs.writeFile(previewPath, html, "utf8");
  addArtifact(artifacts, "teacher_preview_index", "preview-index", previewPath, packDir);
}

function publishPack(packDir, intake) {
  return spawnSync("node", [
    publisherScript,
    "--pack-dir", packDir,
    "--about", `${slug(intake.topic)}-factory`,
    "--prompt", intake.raw_teacher_request,
    "--teacher-vault-config", teacherVaultConfig,
    "--manifest-out", path.join(packDir, "teacher-vault-publish.json")
  ], { cwd: sandboxRoot, encoding: "utf8" });
}

async function verifyPack(packDir, artifacts, intake, router, plan) {
  const missing = [];
  for (const artifact of artifacts) {
    if (!existsSync(path.join(packDir, artifact.path))) missing.push(artifact.path);
  }
  const topicAlignment = await verifyTopicAlignment(packDir, artifacts, plan);
  const pdfCount = artifacts.filter((artifact) => artifact.path.endsWith(".pdf")).length;
  const expected = expectedArtifactMinimum(router);
  return {
    pass: missing.length === 0 && artifacts.length >= expected.artifacts && pdfCount >= expected.pdfs && topicAlignment.pass,
    missing,
    artifact_count: artifacts.length,
    pdf_count: pdfCount,
    expected_artifact_count_min: expected.artifacts,
    expected_pdf_count_min: expected.pdfs,
    topic_alignment: topicAlignment
  };
}

function expectedArtifactMinimum(router) {
  const weights = {
    lesson_slide: { artifacts: 2, pdfs: 1 },
    educational_diagram: { artifacts: 3, pdfs: 1 },
    worksheet: { artifacts: 2, pdfs: 1 },
    homework: { artifacts: 2, pdfs: 1 },
    exit_ticket: { artifacts: 2, pdfs: 1 },
    answer_key: { artifacts: 2, pdfs: 1 },
    teacher_notes: { artifacts: 2, pdfs: 1 },
    source_notes: { artifacts: 1, pdfs: 0 }
  };
  return (router.lanes || []).reduce((acc, lane) => {
    const weight = weights[lane] || { artifacts: 0, pdfs: 0 };
    acc.artifacts += weight.artifacts;
    acc.pdfs += weight.pdfs;
    return acc;
  }, { artifacts: 2, pdfs: 0 });
}

async function verifyTopicAlignment(packDir, artifacts, plan) {
  const terms = (plan.topic_assertion_terms || [plan.canonical_topic])
    .map((term) => String(term || "").toLowerCase().trim())
    .filter(Boolean);
  if (terms.length === 0) return { pass: false, terms, matched_terms: [], checked_files: 0 };

  const textExtensions = new Set([".html", ".md", ".svg", ".json"]);
  let combined = "";
  let checkedFiles = 0;
  for (const artifact of artifacts) {
    const filePath = path.join(packDir, artifact.path);
    if (!textExtensions.has(path.extname(filePath).toLowerCase()) || !existsSync(filePath)) continue;
    combined += `\n${await fs.readFile(filePath, "utf8")}`;
    checkedFiles += 1;
  }
  const lower = combined.toLowerCase();
  const matchedTerms = terms.filter((term) => lower.includes(term));
  return {
    pass: matchedTerms.length > 0,
    terms,
    matched_terms: matchedTerms,
    checked_files: checkedFiles
  };
}

async function htmlToPdf(htmlPath, pdfPath, width, height) {
  const { chromium } = await import(playwrightPath);
  const executableCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium_headless_shell-1217", "chrome-headless-shell-mac-x64", "chrome-headless-shell"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium_headless_shell-1208", "chrome-headless-shell-mac-x64", "chrome-headless-shell")
  ];
  const executablePath = executableCandidates.find((candidate) => candidate && existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    width,
    height,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true
  });
  await browser.close();
}

function addArtifact(artifacts, artifactId, type, absolutePath, packDir) {
  artifacts.push({
    artifact_id: artifactId,
    type,
    path: path.relative(packDir, absolutePath)
  });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadTopicPlanRegistry() {
  const registryPath = path.join(factoryRoot, "config", "topic-plans.json");
  return JSON.parse(await fs.readFile(registryPath, "utf8"));
}

function findTopicPlan(value) {
  const normalized = slug(value);
  return (topicPlanRegistry.plans || []).find((plan) => {
    if (slug(plan.id) === normalized || slug(plan.canonical_topic) === normalized) return true;
    return (plan.match || []).some((matcher) => slug(matcher) === normalized);
  }) || findTopicPlanByText(String(value || ""));
}

function findTopicPlanByText(text) {
  const normalizedText = ` ${String(text || "").toLowerCase()} `;
  return (topicPlanRegistry.plans || []).find((plan) => {
    return (plan.match || []).some((matcher) => normalizedText.includes(String(matcher).toLowerCase()));
  }) || null;
}

function expandTopicPlan(plan) {
  const topicMetadata = {
    plan_id: plan.id,
    canonical_topic: plan.canonical_topic,
    subject: plan.subject,
    default_goal: plan.default_goal,
    match: plan.match || []
  };
  const sourceStrategy = {
    source_grounding_status: plan.source_grounding_status,
    classroom_review_status: plan.classroom_review_status,
    asset_policy: plan.asset_policy,
    sources: plan.sources || [],
    review_notes: plan.review_notes || []
  };
  const laneHints = {
    lesson_slide_template_lane: plan.lesson_slide_template_lane,
    fixture_file: plan.fixture_file || null,
    fixture_path: plan.fixture_file ? path.join(slideTemplateRoot, "examples", plan.fixture_file) : null,
    diagram_type: plan.diagram_type,
    diagram_title: plan.diagram_title,
    diagram_data_file: plan.diagram_data_file || null,
    diagram_data_path: plan.diagram_data_file ? path.join(resourcePackDataRoot, plan.diagram_data_file) : null
  };
  const visualAvailability = {
    has_trusted_public_photo_lane: plan.asset_policy === "trusted_public_photo_first",
    has_deterministic_diagram_lane: Boolean(plan.diagram_data_file) || plan.asset_policy === "deterministic_diagram_first",
    preferred_visual_lane: plan.lesson_slide_template_lane
  };
  const outputBundlePolicy = {
    bundle_type: "core_teaching_pack",
    default_lanes: plan.default_lanes || ["lesson_slide", "educational_diagram", "worksheet", "homework", "answer_key", "teacher_notes", "source_notes"],
    emits_labelling_worksheet: Boolean(plan.diagram_data_file)
  };

  return {
    plan_id: plan.id,
    canonical_topic: plan.canonical_topic,
    topic_metadata: topicMetadata,
    source_strategy: sourceStrategy,
    lane_hints: laneHints,
    visual_availability: visualAvailability,
    output_bundle_policy: outputBundlePolicy,
    lesson_slide_template_lane: plan.lesson_slide_template_lane,
    fixture_path: laneHints.fixture_path,
    source_grounding_status: plan.source_grounding_status,
    classroom_review_status: plan.classroom_review_status,
    asset_policy: plan.asset_policy,
    diagram_type: plan.diagram_type,
    diagram_title: plan.diagram_title,
    diagram_data_path: laneHints.diagram_data_path,
    routing_reason: plan.routing_reason,
    sources: plan.sources || [],
    vocab: plan.vocab || [],
    worksheet_questions: plan.worksheet_questions || [],
    topic_assertion_terms: plan.topic_assertion_terms || [plan.canonical_topic],
    review_notes: plan.review_notes || []
  };
}

function run(command, argv) {
  const result = spawnSync(command, argv, { cwd: sandboxRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${argv.join(" ")}\n${result.stderr || result.stdout}`);
  }
  return result;
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function localDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
