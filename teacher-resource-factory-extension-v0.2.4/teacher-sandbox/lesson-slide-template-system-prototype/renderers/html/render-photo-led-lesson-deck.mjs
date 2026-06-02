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
  if (!fixturePath) fail("Usage: render-photo-led-lesson-deck.mjs <fixture.json> [--out <dir>]");

  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  if (fixture.template_lane !== "photo_led_lesson_deck_v1") {
    fail(`Unsupported template_lane: ${fixture.template_lane}`);
  }

  const outDir = args.out
    ? path.resolve(args.out)
    : path.join(prototypeRoot, "outputs", fixture.about || fixture.fixture_id);
  await fs.mkdir(outDir, { recursive: true });

  const assets = await loadAssets(fixture.assets || {});
  const html = renderHtml(fixture, assets);
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
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
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

function mdEsc(value) {
  return String(value ?? "").replaceAll("\n", " ").trim();
}

async function loadAssets(assetMap) {
  const loaded = {};
  for (const [key, asset] of Object.entries(assetMap)) {
    const sourcePath = path.isAbsolute(asset.path)
      ? asset.path
      : path.join(prototypeRoot, asset.path);
    const ext = path.extname(sourcePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const bytes = await fs.readFile(sourcePath);
    loaded[key] = {
      ...asset,
      source_path: sourcePath,
      data_uri: `data:${mime};base64,${bytes.toString("base64")}`
    };
  }
  return loaded;
}

function assetStyle(assets, key) {
  const asset = assets[key];
  if (!asset) return "";
  return `background-image:url('${asset.data_uri}')`;
}

function assetCredit(assets, key) {
  const asset = assets[key];
  if (!asset) return "";
  return asset.credit || asset.label || "";
}

function renderHtml(fixture, assets) {
  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fixture.title)} · Photo Led Lesson Deck</title>
  <style>
    :root {
      --ink: #f8fafc;
      --paper: #fffaf0;
      --night: #06111f;
      --night2: #102132;
      --text: #102033;
      --muted: #5b6776;
      --gold: #f2b84b;
      --aqua: #63c7c9;
      --green: #78a66d;
      --rose: #cf6c64;
      --violet: #7b71c9;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #d9dee6; color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    body { padding: 24px 0; }
    .slide { position: relative; width: 1280px; height: 720px; margin: 0 auto 26px; overflow: hidden; background: var(--paper); box-shadow: 0 18px 40px rgba(13,24,39,.22); }
    .night { color: var(--ink); background: radial-gradient(circle at 20% 22%, rgba(99,199,201,.22), transparent 24%), radial-gradient(circle at 88% 14%, rgba(242,184,75,.18), transparent 22%), linear-gradient(135deg,#04101c 0%,#102132 56%,#15142b 100%); }
    .stars::before, .stars::after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.6px), radial-gradient(circle,rgba(242,184,75,.82) 0 1px,transparent 1.7px); background-size: 86px 72px,131px 117px; background-position: 8px 11px,31px 46px; opacity: .42; }
    .stars::after { transform: translate(24px,-18px); opacity: .22; }
    .pad { position: relative; z-index: 2; padding: 54px 68px 46px; height: 100%; }
    .kicker { color: var(--gold); font-size: 15px; font-weight: 850; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 14px; }
    .light .kicker { color: #8f6118; }
    h1 { margin: 0; font-size: 62px; line-height: 1; font-weight: 890; max-width: 930px; }
    h2 { margin: 0; font-size: 44px; line-height: 1.05; font-weight: 860; }
    h3 { margin: 0 0 10px; font-size: 25px; line-height: 1.05; font-weight: 840; }
    p { margin: 0; }
    .lead { margin-top: 18px; font-size: 26px; line-height: 1.28; color: rgba(248,250,252,.84); max-width: 780px; }
    .light .lead { color: #52606f; }
    .small { font-size: 16px; line-height: 1.3; color: rgba(248,250,252,.72); }
    .light .small { color: var(--muted); }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; align-items: center; height: 100%; }
    .split.wide-left { grid-template-columns: 1.15fr .85fr; }
    .image-bg { position: absolute; inset: 0; background-size: cover; background-position: center; filter: saturate(1.02) contrast(1.04); }
    .image-bg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,16,28,.92) 0%, rgba(4,16,28,.6) 48%, rgba(4,16,28,.22) 100%); }
    .source-tag { position: absolute; right: 74px; top: 68px; z-index: 2; color: white; font-size: 15px; font-weight: 760; background: rgba(4,16,28,.62); border: 1px solid rgba(255,255,255,.2); padding: 10px 13px; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .badge { padding: 9px 12px; background: #102033; color: #f8fafc; font-size: 17px; font-weight: 760; }
    .light .badge:nth-child(2n) { background: #296a6e; }
    .light .badge:nth-child(3n) { background: #8b554e; }
    .three { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 34px; }
    .two { display: grid; grid-template-columns: repeat(2,1fr); gap: 22px; }
    .tile, .line-card { border: 1px solid rgba(16,32,51,.14); background: rgba(255,255,255,.72); box-shadow: 0 16px 34px rgba(16,32,51,.08); }
    .tile { padding: 24px; min-height: 184px; }
    .line-card { padding: 24px; }
    .night .tile, .night .line-card { color: var(--ink); background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18); box-shadow: none; }
    .tile strong { display: block; font-size: 28px; line-height: 1.05; margin-bottom: 10px; }
    .tile p, .line-card p { font-size: 22px; line-height: 1.28; color: #4f5d6b; }
    .night .tile p, .night .line-card p { color: rgba(248,250,252,.76); }
    .principle { border-top: 7px solid var(--gold); }
    .principle:nth-child(2) { border-top-color: var(--aqua); }
    .principle:nth-child(3) { border-top-color: var(--rose); }
    .callout { margin-top: 28px; padding: 22px 24px; background: #102033; color: #f8fafc; font-size: 29px; line-height: 1.18; font-weight: 810; }
    .photo { position: relative; min-height: 490px; overflow: hidden; background-size: cover; background-position: center; box-shadow: 0 24px 54px rgba(0,0,0,.34); }
    .photo::after { content: ""; position: absolute; inset: 0; border: 1px solid rgba(255,255,255,.18); pointer-events: none; }
    .photo-caption { position: absolute; left: 18px; right: 18px; bottom: 16px; padding: 10px 12px; background: rgba(4,16,28,.68); color: rgba(248,250,252,.88); font-size: 13px; line-height: 1.25; }
    .card-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 15px; margin-top: 26px; }
    .info-card { padding: 16px 17px 15px; min-height: 116px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); color: var(--ink); }
    .info-card strong { display: flex; gap: 9px; align-items: center; font-size: 22px; margin-bottom: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 16px rgba(242,184,75,.72); flex: 0 0 auto; }
    .info-card span { font-size: 17px; line-height: 1.22; color: rgba(248,250,252,.76); }
    .diagram { position: relative; height: 452px; background: radial-gradient(circle at 50% 46%,rgba(242,184,75,.2),transparent 28%), linear-gradient(160deg,#0b1828,#142e43); border: 1px solid rgba(255,255,255,.2); color: var(--ink); }
    .diagram svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .activity { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; margin-top: 30px; }
    .step { padding: 24px; min-height: 255px; background: #fff; border-left: 7px solid var(--gold); box-shadow: 0 16px 34px rgba(16,32,51,.08); }
    .step:nth-child(2) { border-left-color: var(--aqua); }
    .step:nth-child(3) { border-left-color: var(--green); }
    .step .num { font-size: 18px; font-weight: 900; color: #8f6118; margin-bottom: 18px; }
    .step p { font-size: 23px; line-height: 1.28; color: var(--muted); }
    .source-list { display: grid; gap: 11px; margin-top: 24px; font-size: 19px; line-height: 1.24; }
    .source-list a { color: #123a5a; text-decoration: none; border-bottom: 1px solid rgba(18,58,90,.24); }
    .source-note { position: absolute; left: 68px; right: 68px; bottom: 52px; z-index: 3; color: rgba(248,250,252,.55); font-size: 12px; }
    .light .source-note { color: rgba(16,32,51,.5); }
    .footer { position: absolute; left: 68px; right: 68px; bottom: 24px; z-index: 3; display: flex; justify-content: space-between; gap: 24px; color: rgba(248,250,252,.62); font-size: 13px; }
    .light .footer, .source-slide .footer { color: rgba(16,32,51,.55); }
    @media (max-width: 1300px) { body { padding: 0; } .slide { width: 100vw; height: auto; aspect-ratio: 16/9; margin-bottom: 12px; } }
    @media print { @page { size: 13.333in 7.5in; margin: 0; } html, body { width: 13.333in; background: white; padding: 0; } .slide { width: 13.333in; height: 7.5in; margin: 0; box-shadow: none; break-after: page; page-break-after: always; } }
  </style>
</head>
<body>
${fixture.slides.map((slide, index) => renderSlide(fixture, assets, slide, index + 1)).join("\n")}
</body>
</html>`;
}

function renderSlide(fixture, assets, slide, num) {
  const component = components[slide.component];
  if (!component) fail(`Unknown component: ${slide.component}`);
  const themeClass = slide.theme === "night" || slide.component === "full_bleed_photo_cover" || ["card_grid", "relationship_map", "exit_ticket"].includes(slide.component)
    ? "night stars"
    : "light";
  return `<section class="slide ${themeClass}" aria-label="Slide ${num}">
${component(fixture, assets, slide)}
<div class="footer"><span>${esc(fixture.footer_label || `${fixture.title} · source-grounded draft`)}</span><span>${num} / ${fixture.slides.length}</span></div>
</section>`;
}

const components = {
  full_bleed_photo_cover: (_fixture, assets, slide) => {
    const image = slide.image || "cover";
    return `<div class="image-bg" style="${assetStyle(assets, image)}"></div>
<div class="source-tag">${esc(assetCredit(assets, image))}</div>
<div class="pad" style="display:grid;align-content:center;max-width:780px">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="lead">${esc(slide.subtitle)}</p>
  ${badges(slide.badges)}
</div>
<div class="source-note">Image: ${esc(assetCredit(assets, image))}</div>`;
  },

  learning_map_three_cards: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${cards(slide.cards)}</div>
  ${slide.callout ? `<div class="callout">${esc(slide.callout)}</div>` : ""}
</div>`,

  source_cited_definition: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="lead">${esc(slide.lead)}</p>
  ${bullets(slide.bullets)}
  ${slide.callout ? `<div class="callout">${esc(slide.callout)}</div>` : ""}
</div>
<div class="source-note">${esc(slide.source_note || "")}</div>`,

  split_text_photo: (_fixture, assets, slide) => {
    const image = slide.image || "detail";
    return `<div class="pad split wide-left">
  <div>
    <div class="kicker">${esc(slide.kicker)}</div>
    <h1>${esc(slide.title)}</h1>
    <p class="lead">${esc(slide.lead)}</p>
    ${slide.callout ? `<div class="callout">${esc(slide.callout)}</div>` : ""}
  </div>
  <div class="photo" style="${assetStyle(assets, image)}"><div class="photo-caption">${esc(slide.caption || assetCredit(assets, image))}</div></div>
</div>
<div class="source-note">${esc(slide.source_note || `Image: ${assetCredit(assets, image)}`)}</div>`;
  },

  principle_cards: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${cards(slide.cards, "principle")}</div>
  ${slide.note ? `<p class="small" style="margin-top:28px">${esc(slide.note)}</p>` : ""}
</div>
<div class="source-note">${esc(slide.source_note || "")}</div>`,

  relationship_map: (_fixture, _assets, slide) => `<div class="pad split">
  <div>
    <div class="kicker">${esc(slide.kicker)}</div>
    <h1>${esc(slide.title)}</h1>
    <p class="lead">${esc(slide.lead)}</p>
  </div>
  <div class="diagram">${relationshipSvg(slide)}</div>
</div>`,

  card_grid: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="lead">${esc(slide.lead || "")}</p>
  <div class="card-grid">${(slide.items || []).map((item) => `<div class="info-card"><strong><i class="dot"></i>${esc(item.title)}</strong><span>${esc(item.text)}</span></div>`).join("")}</div>
</div>
<div class="source-note">${esc(slide.source_note || "")}</div>`,

  two_column_note: (_fixture, _assets, slide) => `<div class="pad split wide-left">
  <div>
    <div class="kicker">${esc(slide.kicker)}</div>
    <h1>${esc(slide.title)}</h1>
    <p class="lead">${esc(slide.lead)}</p>
    ${slide.callout ? `<div class="callout">${esc(slide.callout)}</div>` : ""}
  </div>
  <div class="two">${cards(slide.cards)}</div>
</div>
<div class="source-note">${esc(slide.source_note || "")}</div>`,

  activity_three_steps: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="activity">${(slide.steps || []).map((step, index) => `<div class="step"><div class="num">${String(index + 1).padStart(2, "0")} · ${esc(step.label)}</div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div>`).join("")}</div>
  ${slide.note ? `<p class="small" style="margin-top:24px">${esc(slide.note)}</p>` : ""}
</div>`,

  exit_ticket: (_fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker)}</div>
  <h1>${esc(slide.title)}</h1>
  <div class="three">${cards((slide.prompts || []).map((text, i) => ({ title: `Prompt ${i + 1}`, text })))}</div>
  ${slide.challenge ? `<div class="callout" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18)">${esc(slide.challenge)}</div>` : ""}
</div>`,

  source_list_slide: (fixture, _assets, slide) => `<div class="pad">
  <div class="kicker">${esc(slide.kicker || "Source grounding")}</div>
  <h1>${esc(slide.title || "Sources used")}</h1>
  <div class="source-list">${(fixture.sources || []).map((source) => `<div><a href="${esc(source.url)}">${esc(source.label)}</a></div>`).join("")}</div>
  <p class="small" style="margin-top:24px">${esc(slide.note || "Keep source and image credits visible when adapting this deck.")}</p>
</div>`
};

function badges(items = []) {
  return items.length ? `<div class="badge-row">${items.map((item) => `<span class="badge">${esc(item)}</span>`).join("")}</div>` : "";
}

function cards(items = [], className = "") {
  return (items || []).map((item) => `<div class="tile ${className}"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div>`).join("");
}

function bullets(items = []) {
  return items?.length
    ? `<div class="three">${items.slice(0, 3).map((item) => `<div class="tile"><strong>${esc(item.title || "Key point")}</strong><p>${esc(item.text || item)}</p></div>`).join("")}</div>`
    : "";
}

function relationshipSvg(slide) {
  const nodes = slide.nodes || [];
  const positions = [
    [280, 70], [438, 133], [456, 305], [280, 386], [102, 310], [102, 130], [280, 226], [470, 226], [90, 226]
  ];
  const colors = ["#cf6c64", "#63c7c9", "#7b71c9", "#f2b84b", "#63c7c9", "#78a66d", "#f2b84b", "#78a66d", "#cf6c64"];
  const center = slide.center || { title: "Core", subtitle: "idea" };
  return `<svg viewBox="0 0 560 452" role="img" aria-label="${esc(slide.title)}">
    <circle cx="280" cy="226" r="62" fill="#f2b84b" opacity=".95"/>
    <text x="280" y="220" text-anchor="middle" fill="#06111f" font-size="20" font-weight="900">${esc(center.title)}</text>
    <text x="280" y="246" text-anchor="middle" fill="#06111f" font-size="15" font-weight="800">${esc(center.subtitle)}</text>
    ${nodes.map((node, index) => {
      const [x, y] = positions[index % positions.length];
      const color = colors[index % colors.length];
      return `<line x1="280" y1="226" x2="${x}" y2="${y}" stroke="${color}" stroke-width="3" opacity=".7"/>
        <circle cx="${x}" cy="${y}" r="38" fill="${color}"/>
        <text x="${x}" y="${y - 3}" text-anchor="middle" fill="#06111f" font-size="15" font-weight="900">${esc(node.title)}</text>
        <text x="${x}" y="${y + 15}" text-anchor="middle" fill="#06111f" font-size="11" font-weight="800">${esc(node.text || "")}</text>`;
    }).join("")}
  </svg>`;
}

function renderSourceNotes(fixture) {
  return `# ${mdEsc(fixture.title)} Source Notes

Generated: 2026-06-01
Template lane: ${mdEsc(fixture.template_lane)}
Fixture: ${mdEsc(fixture.fixture_id)}
Source grounding status: ${mdEsc(fixture.source_grounding_status || "unknown")}
Classroom review status: ${mdEsc(fixture.classroom_review_status || "pending")}

## Sources

${(fixture.sources || []).map((source) => `- ${mdEsc(source.label)}: ${mdEsc(source.url)}`).join("\n")}

## Image Credits

${Object.values(fixture.assets || {}).map((asset) => `- ${mdEsc(asset.label || asset.path)}: ${mdEsc(asset.credit || "")}; ${mdEsc(asset.source || "")}`).join("\n")}

## Review Notes

${(fixture.review_notes || ["Teacher should review before classroom use."]).map((note) => `- ${mdEsc(note)}`).join("\n")}
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
