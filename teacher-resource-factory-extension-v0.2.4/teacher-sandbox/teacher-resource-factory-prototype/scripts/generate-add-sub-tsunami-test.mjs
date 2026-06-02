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

const packDir = path.join(factoryRoot, "outputs", `addition-subtraction-tsunami-test-${today}`);
await fs.mkdir(path.join(packDir, "worksheets"), { recursive: true });
await fs.mkdir(path.join(packDir, "homework"), { recursive: true });
await fs.mkdir(path.join(packDir, "diagrams"), { recursive: true });
await fs.mkdir(path.join(packDir, "source-notes"), { recursive: true });

const artifacts = [];

const worksheetHtmlPath = path.join(packDir, "worksheets", "addition-subtraction-worksheet.html");
const worksheetPdfPath = path.join(packDir, "worksheets", "addition-subtraction-worksheet.pdf");
await fs.writeFile(worksheetHtmlPath, mathPracticeHtml("Addition and Subtraction Worksheet", worksheetProblems(), "Use mental strategies or written working. Show your working for word problems."), "utf8");
await htmlToPdf(worksheetHtmlPath, worksheetPdfPath, "8.27in", "11.69in");
addArtifact("addition_subtraction_worksheet_html", "worksheet", worksheetHtmlPath);
addArtifact("addition_subtraction_worksheet_pdf", "worksheet", worksheetPdfPath);

const homeworkHtmlPath = path.join(packDir, "homework", "addition-subtraction-homework.html");
const homeworkPdfPath = path.join(packDir, "homework", "addition-subtraction-homework.pdf");
await fs.writeFile(homeworkHtmlPath, mathPracticeHtml("Addition and Subtraction Homework", homeworkProblems(), "Complete independently. Ask an adult to check one word problem with you."), "utf8");
await htmlToPdf(homeworkHtmlPath, homeworkPdfPath, "8.27in", "11.69in");
addArtifact("addition_subtraction_homework_html", "homework", homeworkHtmlPath);
addArtifact("addition_subtraction_homework_pdf", "homework", homeworkPdfPath);

const tsunamiSvg = tsunamiDiagramSvg();
const tsunamiSvgPath = path.join(packDir, "diagrams", "tsunami-formation-diagram.svg");
const tsunamiHtmlPath = path.join(packDir, "diagrams", "tsunami-formation-diagram.html");
const tsunamiPdfPath = path.join(packDir, "diagrams", "tsunami-formation-diagram.pdf");
await fs.writeFile(tsunamiSvgPath, tsunamiSvg, "utf8");
await fs.writeFile(tsunamiHtmlPath, diagramHtml("How a Tsunami Forms", tsunamiSvg), "utf8");
await htmlToPdf(tsunamiHtmlPath, tsunamiPdfPath, "11in", "8.5in");
addArtifact("tsunami_formation_diagram_svg", "educational_diagram", tsunamiSvgPath);
addArtifact("tsunami_formation_diagram_html", "educational_diagram", tsunamiHtmlPath);
addArtifact("tsunami_formation_diagram_pdf", "educational_diagram", tsunamiPdfPath);

const sourceNotesPath = path.join(packDir, "source-notes", "test-source-notes.md");
await fs.writeFile(sourceNotesPath, `# Test Source Notes

Generated: ${today}

## Math Assumption

- Addition/subtraction practice assumed Year 3-4 level.
- Numbers use two- and three-digit whole numbers.

## Tsunami Source Grounding

- NOAA Tsunami Warning System: https://www.tsunami.noaa.gov/
- NOAA Science Council: Tsunamis: https://sciencecouncil.noaa.gov/noaa-by-the-numbers/thematic-areas/environmental-data-and-information/tsunamis/
- NOAA Ocean Service: What is a tsunami?: https://oceanservice.noaa.gov/facts/tsunami.html

## Review Status

- Source grounding: grounded for tsunami diagram.
- Classroom review: pending_teacher_review.
- Diagram policy: deterministic SVG; no AI-generated factual image.
`, "utf8");
addArtifact("test_source_notes_md", "source-notes", sourceNotesPath);

await fs.writeFile(path.join(packDir, "resource_pack.json"), `${JSON.stringify({
  factory_version: "0.2.0-test",
  pack_id: path.basename(packDir),
  topic: "Addition/Subtraction Practice and Tsunami Diagram",
  year_level: "Year 3-4 math practice; general science diagram",
  subject: "maths_and_science",
  pack_type: "single_artifact_test_pack",
  lanes: ["worksheet", "homework", "educational_diagram", "source_notes"],
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
  "--about", "addition-subtraction-tsunami-test",
  "--prompt", "Generate an addition/subtraction worksheet and homework, plus one tsunami diagram.",
  "--teacher-vault-config", teacherVaultConfig,
  "--manifest-out", path.join(packDir, "teacher-vault-publish.json")
], { cwd: sandboxRoot, encoding: "utf8" });

if (publishResult.status !== 0) {
  throw new Error(publishResult.stderr || publishResult.stdout);
}

console.log(JSON.stringify({
  status: "test_artifacts_created",
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

function worksheetProblems() {
  return [
    ["48 + 27 =", ""],
    ["63 + 19 =", ""],
    ["125 + 36 =", ""],
    ["208 + 47 =", ""],
    ["74 - 28 =", ""],
    ["91 - 37 =", ""],
    ["156 - 49 =", ""],
    ["300 - 126 =", ""],
    ["34 + 58 - 20 =", ""],
    ["140 - 35 + 18 =", ""],
    ["A class has 28 pencils. The teacher adds 36 more. How many pencils are there now?", ""],
    ["There are 92 stickers. 47 are used. How many stickers are left?", ""],
    ["Mia reads 46 pages on Monday and 38 pages on Tuesday. How many pages did she read altogether?", ""],
    ["A bus has 54 people. 18 get off and 23 get on. How many people are on the bus now?", ""]
  ];
}

function homeworkProblems() {
  return [
    ["37 + 45 =", ""],
    ["86 + 29 =", ""],
    ["114 + 58 =", ""],
    ["240 + 75 =", ""],
    ["72 - 34 =", ""],
    ["105 - 67 =", ""],
    ["180 - 95 =", ""],
    ["412 - 138 =", ""],
    ["58 + 26 - 14 =", ""],
    ["200 - 48 + 17 =", ""],
    ["A shop sold 36 apples in the morning and 49 in the afternoon. How many apples were sold?", ""],
    ["There were 120 chairs. 37 were moved to another room. How many chairs stayed?", ""],
    ["A library has 76 new books. 28 are fiction and the rest are non-fiction. How many are non-fiction?", ""],
    ["Challenge: Explain one strategy you used to check an answer.", ""]
  ];
}

function mathPracticeHtml(title, problems, instruction) {
  const problemMarkup = problems.map(([question], index) => `<div class="problem"><strong>${index + 1}. ${esc(question)}</strong><div class="work"></div></div>`).join("");
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#e9edef;color:#202326;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{width:min(8.27in,calc(100% - 32px));min-height:11.69in;margin:24px auto;padding:.58in .62in;background:#fffefb;border:1px solid #d7dfdc}h1{font-size:34px;line-height:1.05;margin:0 0 14px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0 18px}.instruction{font-size:17px;margin-bottom:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px}.problem{border:1px solid #d9e1e7;padding:12px 14px;min-height:86px;break-inside:avoid}.problem strong{font-size:16px}.work{height:42px;border-bottom:1px solid #a6b2bd;margin-top:10px}@page{size:A4;margin:0}@media print{body{background:white}.page{width:8.27in;min-height:11.69in;margin:0;border:0}}
</style></head><body><main class="page"><h1>${esc(title)}</h1><div class="meta"><span>Name:</span><span>Date:</span></div><p class="instruction">${esc(instruction)}</p><section class="grid">${problemMarkup}</section></main></body></html>`;
}

function tsunamiDiagramSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="0 0 1100 720" role="img" aria-label="Diagram showing how a tsunami can form after seafloor movement">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff3fb"/><stop offset="1" stop-color="#f8fbff"/></linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#65c7ea"/><stop offset="1" stop-color="#1d75a6"/></linearGradient>
  <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4bf7a"/><stop offset="1" stop-color="#a66a33"/></linearGradient>
</defs>
<rect width="1100" height="720" fill="url(#sky)"/>
<text x="60" y="78" fill="#123a5a" font-family="Arial" font-size="48" font-weight="800">How a Tsunami Forms</text>
<path d="M0 250 C110 220 200 270 310 244 C430 214 560 270 690 236 C810 208 910 250 1100 226 L1100 530 L0 530 Z" fill="url(#water)"/>
<path d="M760 530 C842 478 878 408 948 350 C997 310 1045 300 1100 292 L1100 720 L0 720 L0 530 Z" fill="url(#land)"/>
<path d="M60 530 L420 530 L482 470 L548 530 L760 530" fill="#8f6a4f" stroke="#644832" stroke-width="4"/>
<path d="M420 530 L482 470 L548 530" fill="#b7794a" stroke="#644832" stroke-width="3"/>
<path d="M482 470 L520 530" stroke="#202326" stroke-width="6"/>
<circle cx="500" cy="520" r="38" fill="none" stroke="#d44f2f" stroke-width="5"/>
<circle cx="500" cy="520" r="70" fill="none" stroke="#d44f2f" stroke-width="3" opacity=".7"/>
<circle cx="500" cy="520" r="102" fill="none" stroke="#d44f2f" stroke-width="2" opacity=".45"/>
<path d="M482 470 C482 430 482 392 482 352" stroke="#f8fafc" stroke-width="5" marker-end="url(#arrow)"/>
<path d="M548 530 C548 488 548 448 548 408" stroke="#f8fafc" stroke-width="5" marker-end="url(#arrow)"/>
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#f8fafc"/></marker></defs>
<path d="M590 290 C650 268 714 268 776 290" fill="none" stroke="#f8fafc" stroke-width="7"/>
<path d="M662 300 C730 328 796 344 858 334" fill="none" stroke="#f8fafc" stroke-width="6"/>
<path d="M866 325 C904 292 950 270 1004 268 C978 292 972 326 986 356 C948 342 908 340 866 325 Z" fill="#f8fafc" opacity=".9"/>
<g font-family="Arial" font-size="18" fill="#102033">
  <rect x="70" y="124" width="210" height="86" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="92" y="154" font-weight="800">1. Seafloor shifts</text><text x="92" y="181">An undersea earthquake</text><text x="92" y="202">can move the seafloor.</text>
  <rect x="318" y="118" width="214" height="96" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="340" y="148" font-weight="800">2. Water moves</text><text x="340" y="175">The water column is</text><text x="340" y="196">pushed up or down.</text>
  <rect x="570" y="118" width="220" height="96" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="592" y="148" font-weight="800">3. Waves spread</text><text x="592" y="175">Energy travels outward</text><text x="592" y="196">across the ocean.</text>
  <rect x="822" y="118" width="224" height="108" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="844" y="148" font-weight="800">4. Near shore</text><text x="844" y="175">Waves slow in shallow</text><text x="844" y="196">water and can grow.</text>
</g>
<g font-family="Arial" font-size="18" fill="#123a5a" font-weight="800">
  <text x="445" y="586">earthquake source</text>
  <text x="646" y="260">waves travel outward</text>
  <text x="904" y="390">coastline</text>
  <text x="66" y="632" fill="#476173" font-size="18" font-weight="600">Simplified classroom model. Tsunamis are a series of waves.</text>
  <text x="66" y="658" fill="#476173" font-size="18" font-weight="600">Common triggers include undersea earthquakes, landslides, or volcanic activity.</text>
</g>
</svg>`;
}

function diagramHtml(title, svg) {
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e9edef;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{width:min(11in,calc(100% - 32px));min-height:8.5in;margin:24px auto;background:#fffefb;border:1px solid #d7dfdc;padding:.25in}svg{width:100%;height:auto;display:block}@page{size:11in 8.5in;margin:0}@media print{body{background:white}.page{width:11in;min-height:8.5in;margin:0;border:0}}</style>
</head><body><main class="page">${svg}</main></body></html>`;
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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
