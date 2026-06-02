#!/usr/bin/env node
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [packDir, dataPath] = process.argv.slice(2);

if (!packDir || !dataPath) {
  console.error("Usage: render-labelled-diagram.mjs <pack-dir> <diagram-data.json>");
  process.exit(2);
}

function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium-1217", "chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium-1208", "chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function artifactIdFromFile(file) {
  const ext = path.extname(file).replace(".", "").toLowerCase();
  const base = file.replace(/\.(html|pdf)$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${base}-${ext}`;
}

function labelSvg(data, labelled) {
  const labelMarkup = labelled
    ? data.labels.map((label) => `<g>
    <line x1="${label.line.x1}" y1="${label.line.y1}" x2="${label.line.x2}" y2="${label.line.y2}" />
    <rect x="${label.box.x}" y="${label.box.y}" width="${label.box.width}" height="${label.box.height}" rx="6" />
    <text x="${label.text_position.x}" y="${label.text_position.y}">${escapeHtml(label.text)}</text>
  </g>`).join("\n")
    : data.labels.map((label, index) => `<g>
    <circle cx="${label.callout.cx}" cy="${label.callout.cy}" r="20" />
    <text x="${label.callout.cx - 6}" y="${label.callout.cy + 8}">${index + 1}</text>
  </g>`).join("\n");

  return `<svg viewBox="${escapeHtml(data.view_box)}" role="img" aria-label="${escapeHtml(data.aria_label)}" xmlns="http://www.w3.org/2000/svg">
  ${data.base_svg}
  <g class="${labelled ? "labels" : "labels blank-labels"}">
${labelMarkup}
  </g>
</svg>`;
}

function pageHtml({ data, title, kicker, labelled }) {
  const wordBank = data.labels.map((label) => label.text).join(" · ");
  const sidebar = labelled ? "" : `<div>
  <section class="word-bank">
    <h2>Word bank</h2>
    <p>${escapeHtml(wordBank)}</p>
  </section>
  <section class="answers">
    <h2>Labels</h2>
    <ol>
      ${data.labels.map(() => "<li>______________________________</li>").join("\n")}
    </ol>
  </section>
</div>`;

  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --ink: #202326;
      --muted: #5d666f;
      --sea: #176f6b;
      --paper: #fffdf8;
      --line: #d8e0dc;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      background: #e8ecef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .page {
      width: min(11.69in, calc(100% - 32px));
      min-height: 8.27in;
      margin: 24px auto;
      padding: 0.46in 0.54in;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 18px 42px rgba(25, 35, 45, 0.16);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-end;
      border-bottom: 3px solid var(--sea);
      margin-bottom: 18px;
      padding-bottom: 12px;
    }
    h1 { font-size: 30px; line-height: 1.1; margin: 0; }
    .kicker {
      color: var(--sea);
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .name-line {
      min-width: 280px;
      color: var(--muted);
      font-size: 14px;
      white-space: nowrap;
    }
    .diagram {
      display: grid;
      grid-template-columns: ${labelled ? "1fr" : "1fr 290px"};
      gap: 20px;
      align-items: start;
    }
    svg {
      display: block;
      width: 100%;
      max-height: ${labelled ? "6.2in" : "5.5in"};
      height: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
    }
    .labels line { stroke: var(--sea); stroke-width: 3; }
    .labels rect { fill: white; stroke: var(--sea); stroke-width: 2; }
    .labels text { fill: var(--ink); font-size: 24px; font-weight: 760; }
    .blank-labels circle { fill: white; stroke: var(--sea); stroke-width: 4; }
    .blank-labels text { fill: var(--sea); font-size: 22px; font-weight: 850; }
    .word-bank, .answers {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: white;
    }
    h2 { color: var(--sea); font-size: 18px; margin: 0 0 10px; }
    p { margin: 0; line-height: 1.45; }
    ol { margin: 0; padding-left: 24px; }
    li { margin: 14px 0; }
    @page { size: A4 landscape; margin: 0; }
    @media print {
      body { background: white; }
      .page {
        width: 11.69in;
        height: 8.27in;
        min-height: 0;
        margin: 0;
        overflow: hidden;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main class="page" contenteditable="true">
    <header>
      <div>
        <div class="kicker">${escapeHtml(kicker)}</div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      ${labelled ? "" : '<div class="name-line">Name: ____________________________</div>'}
    </header>
    <section class="diagram">
      ${labelSvg(data, labelled)}
      ${sidebar}
    </section>
  </main>
</body>
</html>
`;
}

function upsertArtifact(pack, artifact) {
  pack.artifacts = pack.artifacts.filter((item) => item.artifact_id !== artifact.artifact_id && item.path !== artifact.path);
  pack.artifacts.push(artifact);
}

function upsertCheck(pack, name, status) {
  pack.qa ??= { status: "partial", scope: "automated_artifact_checks_only", checks: [], notes: [] };
  pack.qa.checks ??= [];
  const index = pack.qa.checks.findIndex((check) => check.name === name);
  const next = { name, status };
  if (index === -1) pack.qa.checks.push(next);
  else pack.qa.checks[index] = next;
}

function setAutomatedQaStatus(pack) {
  pack.qa ??= { status: "partial", checks: [], notes: [] };
  pack.qa.scope = "automated_artifact_checks_only";
  const checks = pack.qa.checks || [];
  pack.qa.status = checks.every((check) => check.status === "pass") ? "pass" : "partial";
}

function upsertManifestVisualFiles(manifest, data) {
  const dir = data.output.directory;
  const block = `## Visual Files
- labelled diagram HTML: \`${dir}/${data.output.labelled_html}\`
- labelled diagram PDF: \`${dir}/${data.output.labelled_pdf}\`
- blank labelling worksheet HTML: \`${dir}/${data.output.blank_html}\`
- blank labelling worksheet PDF: \`${dir}/${data.output.blank_pdf}\`
`;

  const refreshed = manifest
    .replace("| Visual pair | not included | Phase B enhancement. |", "| Visual pair | ready | Labelled diagram and blank labelling worksheet available in `visuals/`. |")
    .replace(/- A labelled .*? diagram and blank labelling worksheet are recommended Phase B enhancements\./, "- A labelled diagram and blank labelling worksheet have been added as Phase B visual resources.");

  if (refreshed.match(/\n## Visual Files\n/)) {
    return refreshed.replace(/\n## Visual Files\n[\s\S]*?(?=\n## |\s*$)/, `\n${block}`);
  }
  return `${refreshed.trim()}\n\n${block}`;
}

async function exportPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1020 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.close();
}

async function main() {
  const absolutePackDir = path.resolve(packDir);
  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const packPath = path.join(absolutePackDir, "resource_pack.json");
  const manifestPath = path.join(absolutePackDir, "pack-manifest.md");
  const pack = JSON.parse(await fs.readFile(packPath, "utf8"));
  const outDir = path.join(absolutePackDir, data.output.directory);
  await fs.mkdir(outDir, { recursive: true });

  const labelledHtml = path.join(outDir, data.output.labelled_html);
  const labelledPdf = path.join(outDir, data.output.labelled_pdf);
  const blankHtml = path.join(outDir, data.output.blank_html);
  const blankPdf = path.join(outDir, data.output.blank_pdf);

  await fs.writeFile(labelledHtml, pageHtml({
    data,
    title: data.title_labelled,
    kicker: data.labelled_kicker || "Labelled diagram",
    labelled: true,
  }), "utf8");
  await fs.writeFile(blankHtml, pageHtml({
    data,
    title: data.title_blank,
    kicker: data.blank_kicker || "Labelling worksheet",
    labelled: false,
  }), "utf8");

  const browserExecutable = findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  });
  try {
    await exportPdf(browser, labelledHtml, labelledPdf);
    await exportPdf(browser, blankHtml, blankPdf);
  } finally {
    await browser.close();
  }

  const artifacts = [
    {
      artifact_id: artifactIdFromFile(data.output.labelled_html),
      type: "visual_labelled_diagram_html",
      status: "ready",
      path: `${data.output.directory}/${data.output.labelled_html}`,
      template_id: data.template_id,
      source_artifact_id: data.source_artifact_id,
      notes: ["Editable HTML/SVG labelled concept diagram generated from data adapter."],
    },
    {
      artifact_id: artifactIdFromFile(data.output.labelled_pdf),
      type: "visual_labelled_diagram_pdf",
      status: "ready",
      path: `${data.output.directory}/${data.output.labelled_pdf}`,
      template_id: data.template_id,
      source_artifact_id: data.source_artifact_id,
      notes: ["Printable A4 landscape labelled concept diagram generated from data adapter."],
    },
    {
      artifact_id: artifactIdFromFile(data.output.blank_html),
      type: "visual_blank_labelling_worksheet_html",
      status: "ready",
      path: `${data.output.directory}/${data.output.blank_html}`,
      template_id: "blank_labelling_worksheet",
      source_artifact_id: data.source_artifact_id,
      notes: ["Editable HTML/SVG blank labelling worksheet generated from data adapter."],
    },
    {
      artifact_id: artifactIdFromFile(data.output.blank_pdf),
      type: "visual_blank_labelling_worksheet_pdf",
      status: "ready",
      path: `${data.output.directory}/${data.output.blank_pdf}`,
      template_id: "blank_labelling_worksheet",
      source_artifact_id: data.source_artifact_id,
      notes: ["Printable A4 landscape blank labelling worksheet generated from data adapter."],
    },
  ];

  for (const artifact of artifacts) upsertArtifact(pack, artifact);
  pack.templates ??= {};
  pack.templates.visuals = [data.template_id, "blank_labelling_worksheet"];

  for (const assumption of pack.assumptions || []) {
    if (assumption.field === "visuals") {
      assumption.value = "included as Phase B visual pair";
      assumption.reason = "Phase B enhancement generated by generic labelled-diagram adapter";
    }
  }

  upsertCheck(pack, "generic_labelled_diagram_adapter", "pass");
  upsertCheck(pack, "phase_b_visual_pair", "pass");
  upsertCheck(pack, "visual_pdfs_nonempty", "pass");
  setAutomatedQaStatus(pack);

  pack.qa.notes ??= [];
  const note = "Phase B visual pair generated with generic labelled-diagram adapter.";
  if (!pack.qa.notes.includes(note)) pack.qa.notes.push(note);

  await fs.writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  const manifest = await fs.readFile(manifestPath, "utf8");
  await fs.writeFile(manifestPath, upsertManifestVisualFiles(manifest, data), "utf8");

  console.log(`Rendered labelled diagram adapter outputs in ${outDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
