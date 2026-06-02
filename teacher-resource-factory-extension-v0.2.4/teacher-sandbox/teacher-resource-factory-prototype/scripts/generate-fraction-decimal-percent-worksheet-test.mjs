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
const today = "20260602";

const packDir = path.join(factoryRoot, "outputs", `fraction-decimal-percent-worksheet-${today}`);
await fs.mkdir(path.join(packDir, "worksheets"), { recursive: true });
await fs.mkdir(path.join(packDir, "answers"), { recursive: true });
await fs.mkdir(path.join(packDir, "source-notes"), { recursive: true });

const artifacts = [];

const worksheetHtmlPath = path.join(packDir, "worksheets", "fraction-decimal-percent-conversions.html");
const worksheetPdfPath = path.join(packDir, "worksheets", "fraction-decimal-percent-conversions.pdf");
await fs.writeFile(worksheetHtmlPath, worksheetHtml(), "utf8");
await htmlToPdf(worksheetHtmlPath, worksheetPdfPath, "8.27in", "11.69in");
addArtifact("fraction_decimal_percent_worksheet_html", "worksheet", worksheetHtmlPath);
addArtifact("fraction_decimal_percent_worksheet_pdf", "worksheet", worksheetPdfPath);

const answerHtmlPath = path.join(packDir, "answers", "fraction-decimal-percent-conversions-answers.html");
const answerPdfPath = path.join(packDir, "answers", "fraction-decimal-percent-conversions-answers.pdf");
await fs.writeFile(answerHtmlPath, answerHtml(), "utf8");
await htmlToPdf(answerHtmlPath, answerPdfPath, "8.27in", "11.69in");
addArtifact("fraction_decimal_percent_answers_html", "answer-key", answerHtmlPath);
addArtifact("fraction_decimal_percent_answers_pdf", "answer-key", answerPdfPath);

const sourceNotesPath = path.join(packDir, "source-notes", "fraction-decimal-percent-source-notes.md");
await fs.writeFile(sourceNotesPath, `# Fraction, Decimal, and Percentage Worksheet Notes

Generated: ${today}

## Design Reference

- Created as an original worksheet in the same broad genre as the referenced Chalkie activity sheet.
- Non-copy boundary: the exact Chalkie questions, diagrams, and layout implementation were not copied.

## Content Assumptions

- Assumed Year 6-7 level.
- Focus: equivalent representations, division by 10/100, fraction-to-decimal conversion, decimal-to-percentage conversion, ordering values, and a real-world comparison problem.

## Review Status

- Source grounding: not_required_for_standard_arithmetic.
- Classroom review: pending_teacher_review.
`, "utf8");
addArtifact("fraction_decimal_percent_source_notes_md", "source-notes", sourceNotesPath);

await fs.writeFile(path.join(packDir, "resource_pack.json"), `${JSON.stringify({
  factory_version: "0.2.0-test",
  pack_id: path.basename(packDir),
  topic: "Fraction, Decimal, and Percentage Conversions",
  year_level: "Year 6-7 assumed",
  subject: "mathematics",
  pack_type: "chalkie_style_lesson_series_worksheet_test",
  lanes: ["worksheet", "answer_key", "source_notes"],
  source_grounding_status: "not_required_for_standard_arithmetic",
  classroom_review_status: "pending_teacher_review",
  artifacts: artifacts.map((artifact) => ({
    artifact_id: artifact.artifact_id,
    type: artifact.type,
    path: artifact.path,
    status: "ready"
  })),
  qa: {
    status: "automated_pass",
    source_grounding_status: "not_required_for_standard_arithmetic",
    classroom_review_status: "pending_teacher_review"
  }
}, null, 2)}\n`, "utf8");

const publishResult = spawnSync("node", [
  publisherScript,
  "--pack-dir", packDir,
  "--about", "fraction-decimal-percent",
  "--prompt", "Create a Chalkie-style lesson series worksheet about converting fractions to decimals and percentages.",
  "--teacher-vault-config", teacherVaultConfig,
  "--manifest-out", path.join(packDir, "teacher-vault-publish.json"),
  "--date", today
], { cwd: sandboxRoot, encoding: "utf8" });

if (publishResult.status !== 0) {
  throw new Error(publishResult.stderr || publishResult.stdout);
}

console.log(JSON.stringify({
  status: "fraction_decimal_percent_worksheet_created",
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
  return docHtml("Fraction, Decimal, and Percentage Conversions", `
    <section class="sheet">
      ${nameDate()}
      <h1>Fraction, Decimal, and Percentage Conversions</h1>
      <section class="goal"><strong>Learning goal:</strong> I can move between fractions, decimals, and percentages and explain which representation helps me compare values.</section>

      <h2>Lesson 1: Tenths and Hundredths</h2>
      <div class="question">
        <p><strong>1.</strong> Divide to create decimal fractions.</p>
        <div class="mini-grid">
          <div>6 ÷ 10 = <span class="blank"></span></div>
          <div>42 ÷ 100 = <span class="blank"></span></div>
          <div>135 ÷ 100 = <span class="blank"></span></div>
        </div>
      </div>

      <div class="question">
        <p><strong>2.</strong> Complete the table by writing the fraction and decimal shown by each diagram.</p>
        <table class="diagram-table">
          <thead><tr><th>Diagram</th><th>Fraction</th><th>Decimal</th></tr></thead>
          <tbody>
            <tr><td>${tenthsStrip(4)}</td><td></td><td></td></tr>
            <tr><td>${hundredGrid(35)}</td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="sheet">
      ${nameDate()}
      <h2>Lesson 2: Fractions to Decimals</h2>
      <div class="split">
        <div class="question">
          <p><strong>3.</strong> Convert each fraction to a decimal. Show one line of working.</p>
          ${workItem("a) 1/2")}
          ${workItem("b) 3/4")}
          ${workItem("c) 7/10")}
        </div>
        <aside class="tip"><strong>Top Tip</strong><p>The fraction bar means divide. For example, 3/4 means 3 ÷ 4.</p></aside>
      </div>
    </section>

    <section class="sheet">
      ${nameDate()}
      <h2>Lesson 3: Decimals to Percentages</h2>
      <div class="question">
        <p><strong>4.</strong> Multiply each decimal by 100 to write the percentage.</p>
        <table class="conversion-table">
          <thead><tr><th>Decimal</th><th>Percentage</th></tr></thead>
          <tbody>
            <tr><td>0.32</td><td></td></tr>
            <tr><td>0.07</td><td></td></tr>
            <tr><td>0.6</td><td></td></tr>
            <tr><td>1.15</td><td></td></tr>
          </tbody>
        </table>
      </div>

      <div class="question">
        <p><strong>5.</strong> Look at the hundred grid. Write the shaded amount as a fraction, decimal, and percentage.</p>
        <div class="grid-task">
          ${hundredGrid(68)}
          <div>
            <p>Fraction: <span class="wide-blank"></span></p>
            <p>Decimal: <span class="wide-blank"></span></p>
            <p>Percentage: <span class="wide-blank"></span></p>
          </div>
        </div>
      </div>

      <h2>Lesson 4: Compare and Apply</h2>
      <div class="question">
        <p><strong>6.</strong> Order these values from smallest to largest. Convert them all to percentages first if it helps.</p>
        <p class="values">0.25 | 3/5 | 45% | 0.08 | 7/10</p>
        <div class="write-line"></div>
        <div class="write-line"></div>
      </div>

      <div class="question">
        <p><strong>7.</strong> Real-world problem: Aroha completed 5/8 of a reading challenge. Ben completed 62% of the same challenge. Who completed more? Show your working.</p>
        <div class="write-line"></div>
        <div class="write-line"></div>
        <div class="write-line"></div>
      </div>
    </section>
  `);
}

function answerHtml() {
  return docHtml("Fraction, Decimal, and Percentage Conversions: Answers", `
    <section class="sheet answer">
      <h1>Fraction, Decimal, and Percentage Conversions: Answers</h1>
      <section class="goal">Suggested answers. Accept equivalent notation and clear working.</section>

      <h2>Lesson 1</h2>
      <ol>
        <li>6 ÷ 10 = 0.6; 42 ÷ 100 = 0.42; 135 ÷ 100 = 1.35.</li>
        <li>Diagram 1: 4/10 = 0.4. Diagram 2: 35/100 = 0.35.</li>
      </ol>

      <h2>Lesson 2</h2>
      <ol start="3">
        <li>1/2 = 0.5; 3/4 = 0.75; 7/10 = 0.7.</li>
      </ol>

      <h2>Lesson 3</h2>
      <ol start="4">
        <li>0.32 = 32%; 0.07 = 7%; 0.6 = 60%; 1.15 = 115%.</li>
        <li>68/100, 0.68, 68%.</li>
      </ol>

      <h2>Lesson 4</h2>
      <ol start="6">
        <li>0.08, 0.25, 45%, 3/5, 7/10. Percent equivalents: 8%, 25%, 45%, 60%, 70%.</li>
        <li>Aroha completed more. 5/8 = 0.625 = 62.5%, which is greater than 62%.</li>
      </ol>

      <section class="teacher-note"><strong>Teacher note:</strong> This is a classroom-ready draft. Please check difficulty, notation style, and local curriculum expectations before use.</section>
    </section>
  `);
}

function docHtml(title, body) {
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef3f3;color:#1f2728;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sheet{width:min(8.27in,calc(100% - 32px));min-height:11.69in;margin:24px auto;padding:.54in .6in;background:#fffefb;border:1px solid #d5dedb;box-shadow:0 14px 34px rgba(30,55,60,.08);break-after:page}.sheet:last-child{break-after:auto}h1{font-size:31px;line-height:1.08;margin:22px 0 18px;color:#529a91;letter-spacing:0}h2{font-size:21px;line-height:1.15;margin:20px 0 10px;color:#529a91}.name-date{display:grid;grid-template-columns:1fr 1fr;gap:26px;font-size:13px;font-weight:700}.name-date span{display:inline-block;width:80%;border-bottom:1px solid #1f2728;height:14px}.goal{border-left:7px solid #d68c45;background:#fff2e3;padding:10px 13px;margin:10px 0 18px;font-size:14px}.question{margin:12px 0}.question p{font-size:15px;line-height:1.38;margin:6px 0}.mini-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:14px 0 18px}.mini-grid div{border:1px solid #d3dcda;border-radius:7px;padding:13px;font-size:15px}.blank{display:inline-block;width:70px;border-bottom:1px solid #697879}.wide-blank{display:inline-block;width:145px;border-bottom:1px solid #697879}.diagram-table,.conversion-table{width:100%;border-collapse:collapse;margin-top:9px}.diagram-table th,.diagram-table td,.conversion-table th,.conversion-table td{border:1px solid #3e4646;padding:10px;text-align:left;vertical-align:middle}.diagram-table th,.conversion-table th{font-size:15px;background:#fbfdfc}.diagram-table td{height:138px}.diagram-table th:nth-child(1),.diagram-table td:nth-child(1){width:42%}.diagram svg{display:block;width:190px;height:auto;margin:0 auto}.split{display:grid;grid-template-columns:1fr 210px;gap:14px;align-items:start}.tip{border:1px solid #d6dfdc;border-radius:8px;background:#f4fbf4;padding:13px;margin-top:36px}.tip strong{display:block;color:#2c6e49;font-size:16px;margin-bottom:7px}.tip p{font-size:14px;line-height:1.35;margin:0}.work-item{border:1px solid #d8e0de;border-radius:7px;padding:10px 12px;margin:8px 0}.write-line{height:28px;border-bottom:1px solid #8c9a9b;margin:6px 0}.conversion-table td{height:48px}.grid-task{display:grid;grid-template-columns:230px 1fr;gap:22px;align-items:center}.values{font-size:18px!important;font-weight:800;letter-spacing:0;text-align:center;border:1px solid #d8e0de;border-radius:8px;padding:13px;background:#fbfdfc}.answer li{font-size:16px;line-height:1.45;margin:8px 0}.teacher-note{margin-top:22px;border:1px solid #d6dfdc;border-radius:8px;padding:14px;background:#fbfdfc;font-size:15px;line-height:1.45}.hundred-grid rect,.tenths rect{stroke:#1b3440;stroke-width:1.2}.shade{fill:#b9c0bd}.empty{fill:#fffefb}@page{size:A4;margin:0}@media print{body{background:white}.sheet{width:8.27in;min-height:11.69in;margin:0;border:0;box-shadow:none}}
</style></head><body>${body}</body></html>`;
}

function nameDate() {
  return `<section class="name-date"><div>Name: <span></span></div><div>Date: <span></span></div></section>`;
}

function workItem(label) {
  return `<div class="work-item"><strong>${esc(label)}</strong><div class="write-line"></div></div>`;
}

function tenthsStrip(shaded) {
  const cells = Array.from({ length: 10 }, (_, index) => `<rect class="${index < shaded ? "shade" : "empty"}" x="${index * 18}" y="0" width="18" height="48"/>`).join("");
  return `<div class="diagram"><svg class="tenths" viewBox="0 0 180 48" role="img" aria-label="${shaded} out of 10 shaded">${cells}</svg></div>`;
}

function hundredGrid(shaded) {
  const cells = [];
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const index = row * 10 + col;
      cells.push(`<rect class="${index < shaded ? "shade" : "empty"}" x="${col * 15}" y="${row * 15}" width="15" height="15"/>`);
    }
  }
  return `<div class="diagram"><svg class="hundred-grid" viewBox="0 0 150 150" role="img" aria-label="${shaded} out of 100 shaded">${cells.join("")}</svg></div>`;
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
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
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
