#!/usr/bin/env node
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(here, "../..");
const primaryNode = process.env.OPENCLAW_NODE_BIN || process.execPath;
const runtimeNodeModules = process.env.OPENCLAW_NODE_MODULES || path.resolve(path.dirname(primaryNode), "..", "node_modules");
const playwrightPath = resolvePlaywrightPath();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixturePath = args._[0] ? path.resolve(args._[0]) : null;
  if (!fixturePath) fail("Usage: render-diagram-led-concept-deck.mjs <fixture.json> [--out <dir>]");

  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  if (fixture.template_lane !== "diagram_led_concept_deck_v1") {
    fail(`Unsupported template_lane: ${fixture.template_lane}`);
  }

  const diagramPath = path.isAbsolute(fixture.diagram_data_path)
    ? fixture.diagram_data_path
    : path.join(prototypeRoot, fixture.diagram_data_path);
  const diagram = JSON.parse(await fs.readFile(diagramPath, "utf8"));

  const outDir = args.out
    ? path.resolve(args.out)
    : path.join(prototypeRoot, "outputs", fixture.about || fixture.fixture_id);
  await fs.mkdir(outDir, { recursive: true });

  const html = renderHtml(fixture, diagram);
  const htmlPath = path.join(outDir, `${fixture.about}-slides.html`);
  const pdfPath = path.join(outDir, `${fixture.about}-slides.pdf`);
  const notesPath = path.join(outDir, `${fixture.about}-source-notes.md`);
  const previewPath = path.join(outDir, `${fixture.about}-slides-preview.png`);

  await fs.writeFile(htmlPath, html, "utf8");
  await fs.writeFile(notesPath, renderSourceNotes(fixture), "utf8");
  await renderPdfAndPreview(htmlPath, pdfPath, previewPath);

  console.log(JSON.stringify({
    status: "rendered",
    fixture_id: fixture.fixture_id,
    template_lane: fixture.template_lane,
    slide_count: fixture.slides.length,
    html_path: htmlPath,
    pdf_path: pdfPath,
    source_notes_path: notesPath,
    preview_path: previewPath
  }, null, 2));
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(fixture, diagram) {
  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fixture.title)} · Diagram Led Concept Deck</title>
  <style>
    :root {
      --ink: #192027;
      --paper: #fffdf8;
      --muted: #5d666f;
      --sea: #176f6b;
      --gold: #c77d19;
      --ember: #d44f2f;
      --charcoal: #172033;
      --line: #d8e0dc;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #dfe5e8; color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    body { padding: 24px 0; }
    .slide { position: relative; width: 1280px; height: 720px; margin: 0 auto 26px; overflow: hidden; background: var(--paper); box-shadow: 0 18px 40px rgba(13,24,39,.2); }
    .dark { color: #f8fafc; background: radial-gradient(circle at 76% 18%, rgba(212,79,47,.26), transparent 28%), linear-gradient(135deg,#101820 0%,#263641 58%,#35241e 100%); }
    .pad { position: relative; z-index: 2; height: 100%; padding: 54px 68px 46px; }
    .kicker { color: var(--gold); font-size: 15px; font-weight: 850; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 14px; }
    .light .kicker { color: #8f6118; }
    h1 { margin: 0; font-size: 60px; line-height: 1; font-weight: 890; max-width: 930px; }
    h2 { margin: 0; font-size: 42px; line-height: 1.05; font-weight: 860; }
    h3 { margin: 0 0 10px; font-size: 25px; line-height: 1.05; font-weight: 840; }
    p { margin: 0; }
    .lead { margin-top: 18px; font-size: 25px; line-height: 1.28; color: var(--muted); max-width: 780px; }
    .dark .lead { color: rgba(248,250,252,.82); }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 38px; align-items: center; height: 100%; }
    .wide-left { grid-template-columns: .92fr 1.08fr; }
    .diagram-card { background: white; border: 1px solid var(--line); box-shadow: 0 20px 42px rgba(10,20,30,.16); padding: 16px; }
    .diagram-card svg { width: 100%; height: auto; max-height: 510px; display: block; }
    .cover-diagram { position: absolute; right: 50px; bottom: 42px; width: 570px; opacity: .92; }
    .cover-diagram svg { width: 100%; height: auto; filter: drop-shadow(0 22px 30px rgba(0,0,0,.32)); }
    .badge-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .badge { padding: 9px 12px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); color: #f8fafc; font-size: 17px; font-weight: 760; }
    .light .badge { background: #102033; border: 0; }
    .three { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 34px; }
    .two { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; }
    .tile { border: 1px solid rgba(16,32,51,.14); background: rgba(255,255,255,.78); padding: 24px; min-height: 178px; box-shadow: 0 16px 34px rgba(16,32,51,.08); }
    .tile strong { display: block; font-size: 27px; line-height: 1.05; margin-bottom: 10px; }
    .tile p { font-size: 21px; line-height: 1.28; color: #4f5d6b; }
    .callout { margin-top: 26px; padding: 20px 24px; background: var(--charcoal); color: #f8fafc; font-size: 28px; line-height: 1.18; font-weight: 810; }
    .process { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; margin-top: 30px; }
    .step { padding: 24px; min-height: 260px; background: white; border-left: 7px solid var(--ember); box-shadow: 0 16px 34px rgba(16,32,51,.08); }
    .step:nth-child(2) { border-left-color: var(--gold); }
    .step:nth-child(3) { border-left-color: var(--sea); }
    .step .num { font-size: 18px; font-weight: 900; color: #8f3a27; margin-bottom: 18px; }
    .step p { font-size: 23px; line-height: 1.28; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 15px; margin-top: 26px; }
    .info { padding: 16px 17px 15px; min-height: 122px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); color: #f8fafc; }
    .info strong { display: flex; gap: 9px; align-items: center; font-size: 22px; margin-bottom: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 16px rgba(242,184,75,.72); flex: 0 0 auto; }
    .info span { font-size: 17px; line-height: 1.22; color: rgba(248,250,252,.76); }
    .qa { display: grid; gap: 16px; margin-top: 28px; }
    .qa-item { background: white; border: 1px solid var(--line); padding: 18px 20px; }
    .qa-item strong { display: block; font-size: 22px; margin-bottom: 6px; color: var(--sea); }
    .qa-item span { display: block; color: var(--muted); font-size: 20px; }
    .source-list { display: grid; gap: 11px; margin-top: 24px; font-size: 19px; line-height: 1.24; }
    .source-list a { color: #123a5a; text-decoration: none; border-bottom: 1px solid rgba(18,58,90,.24); }
    .source-note { position: absolute; left: 68px; right: 68px; bottom: 52px; z-index: 3; color: rgba(16,32,51,.5); font-size: 12px; }
    .dark .source-note { color: rgba(248,250,252,.55); }
    .footer { position: absolute; left: 68px; right: 68px; bottom: 24px; z-index: 3; display: flex; justify-content: space-between; gap: 24px; color: rgba(16,32,51,.55); font-size: 13px; }
    .dark .footer { color: rgba(248,250,252,.62); }
    .labels line { stroke: var(--sea); stroke-width: 3; }
    .labels rect { fill: white; stroke: var(--sea); stroke-width: 2; }
    .labels text { fill: var(--ink); font-size: 24px; font-weight: 760; }
    @media (max-width: 1300px) { body { padding: 0; } .slide { width: 100vw; height: auto; aspect-ratio: 16/9; margin-bottom: 12px; } }
    @media print { @page { size: 13.333in 7.5in; margin: 0; } html, body { width: 13.333in; background: white; padding: 0; } .slide { width: 13.333in; height: 7.5in; margin: 0; box-shadow: none; break-after: page; page-break-after: always; } }
  </style>
</head>
<body>
${fixture.slides.map((slide, index) => renderSlide(fixture, diagram, slide, index + 1)).join("\n")}
</body>
</html>`;
}

function renderSlide(fixture, diagram, slide, num) {
  const component = components[slide.component];
  if (!component) fail(`Unknown component: ${slide.component}`);
  const theme = ["diagram_cover", "vocabulary_grid", "exit_ticket"].includes(slide.component) ? "dark" : "light";
  return `<section class="slide ${theme}" aria-label="Slide ${num}">
${component(fixture, diagram, slide)}
<div class="footer"><span>${esc(fixture.footer_label || `${fixture.title} · diagram-led draft`)}</span><span>${num} / ${fixture.slides.length}</span></div>
</section>`;
}

const components = {
  diagram_cover: (_fixture, diagram, slide) => `<div class="cover-diagram">${labelSvg(diagram, false)}</div>
<div class="pad" style="display:grid;align-content:center;max-width:680px">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="lead">${esc(slide.subtitle)}</p>
  ${badges(slide.badges)}
</div>`,

  learning_map: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${cards(slide.cards)}</div>
  ${slide.callout ? `<div class="callout">${esc(slide.callout)}</div>` : ""}
</div>`,

  concept_definition: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="lead">${esc(slide.lead)}</p>
  <div class="three">${cards(slide.bullets)}</div>
</div><div class="source-note">${esc(slide.source_note || "")}</div>`,

  labelled_diagram: (_fixture, diagram, slide) => `<div class="pad split wide-left">
  <div>
    <div class="kicker">${esc(slide.kicker)}</div>
    <h1>${esc(slide.title)}</h1>
    <p class="lead">${esc(slide.lead || diagram.labelled_instruction || "Use the labels to connect vocabulary with the parts of the diagram.")}</p>
  </div>
  <div class="diagram-card">${labelSvg(diagram, true)}</div>
</div><div class="source-note">${esc(slide.source_note || "")}</div>`,

  process_steps: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="process">${(slide.steps || []).map((step, index) => `<div class="step"><div class="num">${String(index + 1).padStart(2, "0")}</div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div>`).join("")}</div>
</div>`,

  vocabulary_grid: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="grid">${(slide.items || []).map((item) => `<div class="info"><strong><i class="dot"></i>${esc(item.title)}</strong><span>${esc(item.text)}</span></div>`).join("")}</div>
</div>`,

  cause_effect: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${(slide.pairs || []).map((pair) => `<div class="tile"><strong>${esc(pair.cause)}</strong><p>${esc(pair.effect)}</p></div>`).join("")}</div>
</div><div class="source-note">${esc(slide.source_note || "")}</div>`,

  two_column_note: (_fixture, _diagram, slide) => `<div class="pad split wide-left">
  <div>
    <div class="kicker">${esc(slide.kicker)}</div>
    <h1>${esc(slide.title)}</h1>
    <p class="lead">${esc(slide.lead)}</p>
  </div>
  <div class="two">${cards(slide.cards)}</div>
</div>`,

  activity_steps: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="process">${(slide.steps || []).map((step, index) => `<div class="step"><div class="num">${String(index + 1).padStart(2, "0")} · ${esc(step.label)}</div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div>`).join("")}</div>
</div>`,

  quick_check: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="qa">${(slide.questions || []).map((item) => `<div class="qa-item"><strong>${esc(item.q)}</strong><span>${esc(item.a)}</span></div>`).join("")}</div>
</div>`,

  exit_ticket: (_fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${cards((slide.prompts || []).map((text, index) => ({ title: `Prompt ${index + 1}`, text })))}</div>
  ${slide.challenge ? `<div class="callout" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18)">${esc(slide.challenge)}</div>` : ""}
</div>`,

  source_list: (fixture, _diagram, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker || "Source grounding")}</div>
  <h1>${esc(slide.title || "Sources used")}</h1>
  <div class="source-list">${(fixture.sources || []).map((source) => `<div><a href="${esc(source.url)}">${esc(source.label)}</a></div>`).join("")}</div>
  <p class="lead">${esc(slide.note || "Keep source notes visible when adapting this deck.")}</p>
</div>`
};

function labelSvg(data, labelled) {
  const labelMarkup = labelled
    ? data.labels.map((label) => `<g>
    <line x1="${label.line.x1}" y1="${label.line.y1}" x2="${label.line.x2}" y2="${label.line.y2}" />
    <rect x="${label.box.x}" y="${label.box.y}" width="${label.box.width}" height="${label.box.height}" rx="6" />
    <text x="${label.text_position.x}" y="${label.text_position.y}">${esc(label.text)}</text>
  </g>`).join("\n")
    : data.labels.map((label, index) => `<g>
    <circle cx="${label.callout.cx}" cy="${label.callout.cy}" r="20" fill="white" stroke="#176f6b" stroke-width="4"/>
    <text x="${label.callout.cx - 6}" y="${label.callout.cy + 8}" fill="#176f6b" font-size="22" font-weight="850">${index + 1}</text>
  </g>`).join("\n");

  return `<svg viewBox="${esc(data.view_box)}" role="img" aria-label="${esc(data.aria_label)}" xmlns="http://www.w3.org/2000/svg">
  ${data.base_svg}
  <g class="${labelled ? "labels" : "blank-labels"}">${labelMarkup}</g>
</svg>`;
}

function badges(items = []) {
  return items.length ? `<div class="badge-row">${items.map((item) => `<span class="badge">${esc(item)}</span>`).join("")}</div>` : "";
}

function cards(items = []) {
  return (items || []).map((item) => `<div class="tile"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div>`).join("");
}

function renderSourceNotes(fixture) {
  return `# ${fixture.title} Source Notes

Generated: 2026-06-01
Template lane: ${fixture.template_lane}
Fixture: ${fixture.fixture_id}
Source grounding status: ${fixture.source_grounding_status}
Classroom review status: ${fixture.classroom_review_status}

## Sources

${(fixture.sources || []).map((source) => `- ${source.label}: ${source.url}`).join("\n")}

## Review Notes

${(fixture.review_notes || []).map((note) => `- ${note}`).join("\n")}
`;
}

async function renderPdfAndPreview(htmlPath, pdfPath, previewPath) {
  const { chromium } = await import(playwrightPath);
  const executableCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium_headless_shell-1217", "chrome-headless-shell-mac-x64", "chrome-headless-shell"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", "chromium_headless_shell-1208", "chrome-headless-shell-mac-x64", "chrome-headless-shell")
  ];
  const executablePath = executableCandidates.find((candidate) => candidate && existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: pdfPath,
    width: "13.333in",
    height: "7.5in",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
    preferCSSPageSize: true
  });
  await page.emulateMedia({ media: "screen" });
  await page.locator(".slide").first().screenshot({ path: previewPath, animations: "disabled" });
  await browser.close();
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

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
