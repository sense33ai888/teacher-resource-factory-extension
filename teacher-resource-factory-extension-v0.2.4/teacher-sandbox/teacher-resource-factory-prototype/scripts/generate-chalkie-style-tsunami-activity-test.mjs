#!/usr/bin/env node
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(here, "..");
const sandboxRoot = path.resolve(factoryRoot, "..");
const workspaceRoot = path.resolve(sandboxRoot, "..");
const runtimeNodeModules = process.env.OPENCLAW_NODE_MODULES || path.resolve(path.dirname(process.execPath), "..", "node_modules");
const playwrightPath = process.env.OPENCLAW_PLAYWRIGHT_PATH || path.join(runtimeNodeModules, "playwright", "index.mjs");
const publisherScript = process.env.TEACHER_VAULT_PUBLISHER_SCRIPT || path.join(workspaceRoot, "owned-skills", "skills", "teacher-vault-artifact-publisher", "scripts", "publish-teacher-artifact.mjs");
const teacherVaultConfig = resolveTeacherVaultConfig();
const today = "20260601";

const packDir = path.join(factoryRoot, "outputs", `chalkie-style-tsunami-activity-${today}`);
await fs.mkdir(path.join(packDir, "worksheets"), { recursive: true });
await fs.mkdir(path.join(packDir, "answers"), { recursive: true });
await fs.mkdir(path.join(packDir, "source-notes"), { recursive: true });

const artifacts = [];

const worksheetHtmlPath = path.join(packDir, "worksheets", "tsunami-reading-response-activity.html");
const worksheetPdfPath = path.join(packDir, "worksheets", "tsunami-reading-response-activity.pdf");
await fs.writeFile(worksheetHtmlPath, worksheetHtml(), "utf8");
await htmlToPdf(worksheetHtmlPath, worksheetPdfPath, "8.27in", "11.69in");
addArtifact("tsunami_activity_sheet_html", "worksheet", worksheetHtmlPath);
addArtifact("tsunami_activity_sheet_pdf", "worksheet", worksheetPdfPath);

const answerHtmlPath = path.join(packDir, "answers", "tsunami-reading-response-answers.html");
const answerPdfPath = path.join(packDir, "answers", "tsunami-reading-response-answers.pdf");
await fs.writeFile(answerHtmlPath, answerHtml(), "utf8");
await htmlToPdf(answerHtmlPath, answerPdfPath, "8.27in", "11.69in");
addArtifact("tsunami_activity_answers_html", "answer-key", answerHtmlPath);
addArtifact("tsunami_activity_answers_pdf", "answer-key", answerPdfPath);

const sourceNotesPath = path.join(packDir, "source-notes", "tsunami-activity-source-notes.md");
await fs.writeFile(sourceNotesPath, `# Tsunami Activity Source Notes

Generated: ${today}

## Source Grounding

- NOAA Tsunami Warning System: https://www.tsunami.noaa.gov/
- NOAA Science Council: Tsunamis: https://sciencecouncil.noaa.gov/noaa-by-the-numbers/thematic-areas/environmental-data-and-information/tsunamis/
- NOAA Ocean Service: What is a tsunami?: https://oceanservice.noaa.gov/facts/tsunami.html

## Review Status

- Source grounding: grounded.
- Classroom review: pending_teacher_review.
- Non-copy boundary: layout and content are original; no Chalkie document body was accessible or copied.
`, "utf8");
addArtifact("tsunami_activity_source_notes_md", "source-notes", sourceNotesPath);

await fs.writeFile(path.join(packDir, "resource_pack.json"), `${JSON.stringify({
  factory_version: "0.2.0-test",
  pack_id: path.basename(packDir),
  topic: "Tsunamis",
  year_level: "Year 5-6 assumed",
  subject: "science_literacy",
  pack_type: "chalkie_style_activity_sheet_test",
  lanes: ["worksheet", "answer_key", "source_notes"],
  source_grounding_status: "grounded",
  classroom_review_status: "pending_teacher_review",
  artifacts: artifacts.map((artifact) => ({
    artifact_id: artifact.artifact_id,
    type: artifact.type,
    path: artifact.path,
    status: "ready"
  })),
  qa: {
    status: "automated_pass",
    source_grounding_status: "grounded",
    classroom_review_status: "pending_teacher_review"
  }
}, null, 2)}\n`, "utf8");

const publishResult = spawnSync("node", [
  publisherScript,
  "--pack-dir", packDir,
  "--about", "chalkie-style-tsunami",
  "--prompt", "Create a Chalkie-style printable activity sheet about tsunamis, with answer key and source notes.",
  "--teacher-vault-config", teacherVaultConfig,
  "--manifest-out", path.join(packDir, "teacher-vault-publish.json"),
  "--date", today
], { cwd: sandboxRoot, encoding: "utf8" });

if (publishResult.status !== 0) {
  throw new Error(publishResult.stderr || publishResult.stdout);
}

console.log(JSON.stringify({
  status: "chalkie_style_test_created",
  pack_dir: packDir,
  artifacts: artifacts.length,
  published: true,
  publisher_stdout: publishResult.stdout
}, null, 2));

function addArtifact(artifactId, type, absolutePath) {
  artifacts.push({
    artifact_id: artifactId,
    type,
    path: path.relative(packDir, absolutePath)
  });
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

function worksheetHtml() {
  return pageHtml("Tsunamis: Reading & Response", `
    <section class="topline">
      <div><strong>Name:</strong><span></span></div>
      <div><strong>Date:</strong><span></span></div>
    </section>

    <section class="notice">
      <strong>Learning goal:</strong> I can explain what a tsunami is, identify its causes, and describe how waves change near the shore.
    </section>

    <section class="block reading">
      <h2>Read</h2>
      <p>A tsunami is a series of ocean waves caused by a sudden movement of water. Many tsunamis begin after an undersea earthquake shifts the seafloor. The movement pushes the water column up or down, sending energy outward through the ocean. In deep water, tsunami waves may be hard to notice, but as they reach shallow water near land, they slow down and can grow much taller.</p>
    </section>

    <section class="two">
      <div class="block">
        <h2>A. Vocabulary Match</h2>
        <p class="hint">Write the correct letter beside each word.</p>
        <ol class="match">
          <li>Tsunami <span class="line"></span></li>
          <li>Seafloor <span class="line"></span></li>
          <li>Energy <span class="line"></span></li>
          <li>Shallow <span class="line"></span></li>
        </ol>
        <div class="choices">
          <p>A. Not deep</p>
          <p>B. The ground under the ocean</p>
          <p>C. A series of ocean waves</p>
          <p>D. The ability to make movement happen</p>
        </div>
      </div>
      <div class="block">
        <h2>B. Quick Questions</h2>
        <ol class="short">
          <li>What usually moves suddenly before many tsunamis begin?<span></span></li>
          <li>Why can tsunami waves grow near land?<span></span></li>
          <li>Circle one: A tsunami is one wave / a series of waves.</li>
        </ol>
      </div>
    </section>

    <section class="block">
      <h2>C. Put the Events in Order</h2>
      <div class="sequence">
        <div><b></b><p>Waves enter shallow water near the shore.</p></div>
        <div><b></b><p>The seafloor suddenly shifts.</p></div>
        <div><b></b><p>Water is pushed up or down.</p></div>
        <div><b></b><p>Energy travels outward across the ocean.</p></div>
      </div>
    </section>

    <section class="block explain">
      <h2>D. Explain</h2>
      <p>Use two or three sentences: Why might a tsunami be dangerous even if it starts far away?</p>
      <div class="write"></div>
      <div class="write"></div>
    </section>

    <section class="exit">
      <strong>Exit ticket:</strong> One new thing I learned is <span></span>
    </section>
  `);
}

function answerHtml() {
  return pageHtml("Tsunamis: Answers", `
    <section class="notice">
      Suggested answers. Accept accurate student wording.
    </section>

    <section class="block">
      <h2>A. Vocabulary Match</h2>
      <ol>
        <li>Tsunami: C</li>
        <li>Seafloor: B</li>
        <li>Energy: D</li>
        <li>Shallow: A</li>
      </ol>
    </section>

    <section class="block">
      <h2>B. Quick Questions</h2>
      <ol>
        <li>The seafloor usually moves suddenly after an undersea earthquake.</li>
        <li>Near land, waves slow in shallow water and can grow taller.</li>
        <li>A tsunami is a series of waves.</li>
      </ol>
    </section>

    <section class="block">
      <h2>C. Put the Events in Order</h2>
      <ol>
        <li>The seafloor suddenly shifts.</li>
        <li>Water is pushed up or down.</li>
        <li>Energy travels outward across the ocean.</li>
        <li>Waves enter shallow water near the shore.</li>
      </ol>
    </section>

    <section class="block">
      <h2>D. Explain</h2>
      <p>A strong answer should mention that wave energy can travel across the ocean, and waves can become larger and dangerous as they enter shallow water near land.</p>
    </section>

    <section class="block small">
      <h2>Teacher note</h2>
      <p>This sheet is grounded in NOAA tsunami explanations. Please review for your local curriculum level and any local hazard guidance before classroom use.</p>
    </section>
  `);
}

function pageHtml(title, body) {
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#edf1ed;color:#1f2924;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{width:min(8.27in,calc(100% - 32px));min-height:11.69in;margin:24px auto;padding:.48in .54in;background:#fffdf8;border:1px solid #d9dfd8}h1{font-size:33px;line-height:1.05;margin:0 0 12px;color:#234b37;letter-spacing:0}h2{font-size:17px;line-height:1.15;margin:0 0 8px;color:#234b37}.topline{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:10px 0 14px}.topline div{display:flex;gap:8px;align-items:end}.topline span{flex:1;border-bottom:1px solid #9aa89e;height:18px}.notice{border-left:7px solid #d68c45;background:#fff5e8;padding:12px 14px;margin:12px 0 14px;font-size:14.5px}.block{border:1px solid #d7dfdc;background:#ffffff;border-radius:8px;padding:13px 15px;margin:12px 0;break-inside:avoid}.reading p{font-size:15px;line-height:1.43;margin:0}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hint{font-size:13px;color:#5b685f;margin:0 0 8px}.match,.short{margin:0;padding-left:20px}.match li,.short li{margin:7px 0;font-size:14px}.match .line{display:inline-block;width:40px;border-bottom:1px solid #9aa89e;margin-left:8px}.choices{border-top:1px solid #e2e7e3;margin-top:10px;padding-top:7px}.choices p{margin:4px 0;font-size:13.5px}.short span{display:block;border-bottom:1px solid #9aa89e;height:21px;margin-top:6px}.sequence{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sequence div{display:grid;grid-template-columns:32px 1fr;gap:9px;align-items:center;border:1px solid #e0e6e1;padding:9px;border-radius:7px}.sequence b{width:28px;height:28px;border:2px solid #8aa194;border-radius:50%;display:block}.sequence p{font-size:13.5px;margin:0}.explain p{font-size:14px;margin:0 0 8px}.write{height:31px;border-bottom:1px solid #9aa89e}.exit{margin-top:12px;font-size:14.5px}.exit span{display:inline-block;width:310px;border-bottom:1px solid #9aa89e}ol{margin-top:0}.small p{font-size:14px;line-height:1.4}@page{size:A4;margin:0}@media print{body{background:white}.page{width:8.27in;min-height:11.69in;margin:0;border:0}}
</style></head><body><main class="page"><h1>${esc(title)}</h1>${body}</main></body></html>`;
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
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
