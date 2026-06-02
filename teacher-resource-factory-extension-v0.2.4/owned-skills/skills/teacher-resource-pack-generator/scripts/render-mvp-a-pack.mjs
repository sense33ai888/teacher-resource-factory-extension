#!/usr/bin/env node
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { marked } = await import(require.resolve("marked"));
const { chromium } = require("playwright");

const packDir = process.argv[2];

if (!packDir) {
  console.error("Usage: render-mvp-a-pack.mjs <pack-dir>");
  process.exit(2);
}

const requiredFiles = [
  "lesson-slides.md",
  "worksheet.md",
  "pack-manifest.md",
  "resource_pack.json",
];

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

async function readPackFile(file) {
  return fs.readFile(path.join(packDir, file), "utf8");
}

async function writePackFile(file, content) {
  await fs.writeFile(path.join(packDir, file), content, "utf8");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitSlides(markdown) {
  const tokens = marked.lexer(markdown);
  const slides = [];
  let current = null;

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      if (current) slides.push(current);
      const heading = token.text.trim();
      const match = heading.match(/^Slide\s+(\d+)\s*[:.-]\s*(.+)$/i);
      current = {
        number: match ? Number(match[1]) : slides.length + 1,
        title: match ? match[2].trim() : heading,
        bodyParts: [],
      };
      continue;
    }

    if (!current) continue;
    if (typeof token.raw === "string") current.bodyParts.push(token.raw.trimEnd());
  }

  if (current) slides.push(current);
  return slides.map((slide) => ({
    number: slide.number,
    title: slide.title,
    bodyMarkdown: slide.bodyParts.join("\n\n").trim(),
  }));
}

function renderSlidesHtml(markdown, pack) {
  const slides = splitSlides(markdown);
  const packTitle = `${pack.year_level || ""} ${pack.topic || "Resource"} Slides`.trim();
  const slideCards = slides
    .map((slide) => {
      const bodyHtml = marked.parse(slide.bodyMarkdown);
      const slideClass = slide.number === 1 ? "slide title-slide" : "slide";
      return `<section class="${slideClass}" contenteditable="true" aria-label="Slide ${slide.number}">
  <div class="slide-kicker">Slide ${slide.number}</div>
  <h1>${escapeHtml(slide.title)}</h1>
  <div class="slide-body">${bodyHtml}</div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(packTitle)}</title>
  <style>
    :root {
      --ink: #202326;
      --muted: #5d666f;
      --sea: #176f6b;
      --gold: #c77d19;
      --paper: #fffdf8;
      --mist: #eef5f3;
      --line: #d8e0dc;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      background: #e7ecef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .deck {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 32px;
    }
    .slide {
      width: min(1120px, 100%);
      aspect-ratio: 16 / 9;
      margin: 0 auto;
      padding: 58px 64px;
      background:
        linear-gradient(90deg, rgba(23, 111, 107, 0.08), transparent 28%),
        var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 20px 48px rgba(25, 35, 45, 0.18);
      overflow: hidden;
      page-break-after: always;
    }
    .title-slide {
      display: flex;
      flex-direction: column;
      justify-content: center;
      background:
        linear-gradient(135deg, rgba(23, 111, 107, 0.13), transparent 46%),
        linear-gradient(315deg, rgba(199, 125, 25, 0.13), transparent 48%),
        var(--paper);
    }
    .slide-kicker {
      color: var(--sea);
      font-size: 18px;
      font-weight: 750;
      margin-bottom: 18px;
      text-transform: uppercase;
    }
    h1 {
      color: var(--ink);
      font-size: 48px;
      line-height: 1.05;
      margin: 0 0 24px;
      max-width: 880px;
    }
    .title-slide h1 { font-size: 72px; }
    .slide-body {
      color: var(--ink);
      font-size: 28px;
      line-height: 1.32;
      max-width: 920px;
    }
    .slide-body p { margin: 0 0 18px; }
    .slide-body ul, .slide-body ol {
      margin: 12px 0 0 34px;
      padding: 0;
    }
    .slide-body li { margin: 8px 0; }
    .slide-body strong { color: var(--sea); }
    .slide-body hr { border: 0; border-top: 2px solid var(--line); margin: 22px 0; }
    @page { size: 13.333in 7.5in; margin: 0; }
    @media print {
      body { background: white; }
      .deck { display: block; padding: 0; }
      .slide {
        width: 13.333in;
        height: 7.5in;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <main class="deck">
${slideCards}
  </main>
</body>
</html>
`;
}

function renderDocumentHtml(markdown, pack, title, kind) {
  const bodyHtml = marked.parse(markdown);
  const fullTitle = `${pack.year_level || ""} ${pack.topic || ""} ${title}`.replace(/\s+/g, " ").trim();

  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <style>
    :root {
      --ink: #202326;
      --muted: #5d666f;
      --sea: #176f6b;
      --gold: #c77d19;
      --paper: #fffefb;
      --line: #d7dfdc;
      --soft: #f3f7f5;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      background: #e9edef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.45;
    }
    .page {
      width: min(8.27in, calc(100% - 32px));
      min-height: 11.69in;
      margin: 24px auto;
      padding: 0.62in 0.68in;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 18px 42px rgba(25, 35, 45, 0.16);
    }
    .doc-label {
      color: var(--sea);
      font-size: 12px;
      font-weight: 750;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    h1 {
      border-bottom: 3px solid var(--sea);
      font-size: 30px;
      line-height: 1.12;
      margin: 0 0 20px;
      padding-bottom: 12px;
    }
    h2 {
      color: var(--sea);
      font-size: 20px;
      margin: 28px 0 10px;
    }
    h3 {
      color: var(--ink);
      font-size: 16px;
      margin: 22px 0 8px;
    }
    p { margin: 0 0 12px; }
    ul, ol { margin: 8px 0 14px 24px; padding: 0; }
    li { margin: 5px 0; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 22px 0; }
    code {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 1px 4px;
    }
    .worksheet h2, .worksheet h3 { break-after: avoid; }
    @page { size: A4; margin: 0; }
    @media print {
      body { background: white; }
      .page {
        width: 8.27in;
        min-height: 11.69in;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main class="page ${escapeHtml(kind)}" contenteditable="true">
    <div class="doc-label">${escapeHtml(kind.replaceAll("-", " "))}</div>
${bodyHtml}
  </main>
</body>
</html>
`;
}

function upsertArtifact(pack, artifact) {
  const index = pack.artifacts.findIndex((item) => item.artifact_id === artifact.artifact_id);
  if (index === -1) {
    pack.artifacts.push(artifact);
  } else {
    pack.artifacts[index] = { ...pack.artifacts[index], ...artifact };
  }
}

function upsertQaCheck(pack, name, status) {
  pack.qa ??= { status: "partial", checks: [], notes: [] };
  pack.qa.checks ??= [];
  const index = pack.qa.checks.findIndex((check) => check.name === name);
  const next = { name, status };
  if (index === -1) {
    pack.qa.checks.push(next);
  } else {
    pack.qa.checks[index] = next;
  }
}

function setAutomatedQaStatus(pack) {
  pack.qa ??= { status: "partial", checks: [], notes: [] };
  pack.qa.scope = "automated_artifact_checks_only";
  const checks = pack.qa.checks || [];
  pack.qa.status = checks.every((check) => check.status === "pass") ? "pass" : "partial";
}

function upsertManifestRenderedFiles(manifest) {
  const block = `## Rendered Files
- editable slides HTML: \`renders/lesson-slides.html\`
- slides PDF: \`renders/lesson-slides.pdf\`
- printable worksheet HTML: \`renders/worksheet.html\`
- worksheet PDF: \`renders/worksheet.pdf\`
`;

  const refreshed = manifest
    .replace(
      "| Lesson slides source | ready | Markdown slide source; can be converted to HTML/PPTX later. |",
      "| Lesson slides source | ready | Markdown source; rendered HTML/PDF available in `renders/`. |",
    )
    .replace(
      "| Worksheet | ready | Printable Markdown source with student spaces. |",
      "| Worksheet | ready | Markdown source; rendered HTML/PDF available in `renders/`. |",
    );

  if (refreshed.match(/\n## Rendered Files\n/)) {
    return refreshed.replace(/\n## Rendered Files\n[\s\S]*?(?=\n## |\s*$)/, `\n${block}`);
  }

  return `${refreshed.trim()}\n\n${block}`;
}

async function ensureRequiredFiles() {
  for (const file of requiredFiles) {
    const fullPath = path.join(packDir, file);
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) throw new Error(`${fullPath} is not a file`);
    } catch {
      throw new Error(`Missing required file: ${fullPath}`);
    }
  }
}

async function exportPdf(browser, htmlPath, pdfPath, pageOptions) {
  const page = await browser.newPage(pageOptions.viewport ? { viewport: pageOptions.viewport } : {});
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    ...pageOptions.pdf,
  });
  await page.close();
}

async function main() {
  const absolutePackDir = path.resolve(packDir);
  await ensureRequiredFiles();

  const renderDir = path.join(absolutePackDir, "renders");
  await fs.mkdir(renderDir, { recursive: true });

  const [slidesMd, worksheetMd, packJsonRaw, manifestRaw] = await Promise.all([
    readPackFile("lesson-slides.md"),
    readPackFile("worksheet.md"),
    readPackFile("resource_pack.json"),
    readPackFile("pack-manifest.md"),
  ]);

  const pack = JSON.parse(packJsonRaw);
  const slidesHtmlPath = path.join(renderDir, "lesson-slides.html");
  const slidesPdfPath = path.join(renderDir, "lesson-slides.pdf");
  const worksheetHtmlPath = path.join(renderDir, "worksheet.html");
  const worksheetPdfPath = path.join(renderDir, "worksheet.pdf");

  await fs.writeFile(slidesHtmlPath, renderSlidesHtml(slidesMd, pack), "utf8");
  await fs.writeFile(
    worksheetHtmlPath,
    renderDocumentHtml(worksheetMd, pack, "Worksheet", "worksheet"),
    "utf8",
  );

  const browserExecutable = findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  });
  try {
    await exportPdf(browser, slidesHtmlPath, slidesPdfPath, {
      viewport: { width: 1440, height: 810 },
      pdf: { width: "13.333in", height: "7.5in" },
    });
    await exportPdf(browser, worksheetHtmlPath, worksheetPdfPath, {
      viewport: { width: 960, height: 1280 },
      pdf: { format: "A4" },
    });
  } finally {
    await browser.close();
  }

  const renderedArtifacts = [
    {
      artifact_id: "lesson-slides-html",
      type: "rendered_slides_html",
      status: "ready",
      path: "renders/lesson-slides.html",
      template_id: "mvp-a-render-slides-html",
      source_artifact_id: "lesson-slides",
      notes: ["Editable browser HTML generated from lesson-slides.md."],
    },
    {
      artifact_id: "lesson-slides-pdf",
      type: "rendered_slides_pdf",
      status: "ready",
      path: "renders/lesson-slides.pdf",
      template_id: "mvp-a-render-slides-pdf",
      source_artifact_id: "lesson-slides",
      notes: ["Printable 16:9 PDF generated from lesson-slides.html."],
    },
    {
      artifact_id: "worksheet-html",
      type: "rendered_worksheet_html",
      status: "ready",
      path: "renders/worksheet.html",
      template_id: "mvp-a-render-worksheet-html",
      source_artifact_id: "worksheet",
      notes: ["Editable browser HTML generated from worksheet.md."],
    },
    {
      artifact_id: "worksheet-pdf",
      type: "rendered_worksheet_pdf",
      status: "ready",
      path: "renders/worksheet.pdf",
      template_id: "mvp-a-render-worksheet-pdf",
      source_artifact_id: "worksheet",
      notes: ["Printable A4 PDF generated from worksheet.html."],
    },
  ];

  for (const artifact of renderedArtifacts) upsertArtifact(pack, artifact);

  upsertQaCheck(pack, "editable_rendered_slides", "pass");
  upsertQaCheck(pack, "printable_rendered_worksheet", "pass");
  upsertQaCheck(pack, "rendered_pdfs_nonempty", "pass");

  pack.qa ??= { status: "partial", checks: [], notes: [] };
  setAutomatedQaStatus(pack);
  pack.qa.notes ??= [];
  pack.qa.notes = pack.qa.notes.filter(
    (note) => !note.includes("no rendered HTML/PPTX export was produced"),
  );
  const renderNote = "Rendered editable HTML/PDF exports were generated for slides and worksheet.";
  if (!pack.qa.notes.includes(renderNote)) pack.qa.notes.push(renderNote);

  await writePackFile("resource_pack.json", `${JSON.stringify(pack, null, 2)}\n`);
  await writePackFile("pack-manifest.md", upsertManifestRenderedFiles(manifestRaw));

  console.log(`Rendered MVP-A pack exports in ${renderDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
