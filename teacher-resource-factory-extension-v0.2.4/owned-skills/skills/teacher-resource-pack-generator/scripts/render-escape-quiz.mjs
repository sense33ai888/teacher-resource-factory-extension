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
  console.error("Usage: render-escape-quiz.mjs <pack-dir> <quiz-data.json>");
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

function artifactIdFromFile(file, suffix = "") {
  const ext = path.extname(file).replace(".", "").toLowerCase();
  const base = file.replace(/\.(html|pdf)$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  if (!suffix) return `${base}-${ext}`;
  return suffix ? `${base}-${suffix}` : base;
}

function gameHtml(pack, data) {
  const title = `${pack.year_level || ""} ${data.title}`.trim();
  const settings = {
    easy: { seconds: data.timer_seconds?.easy ?? 720, label: "Easy" },
    core: { seconds: data.timer_seconds?.core ?? 600, label: "Core" },
    challenge: { seconds: data.timer_seconds?.challenge ?? 480, label: "Challenge" },
  };

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
      --paper: #fffdf8;
      --sea: #176f6b;
      --line: #d7dfdc;
      --danger: #a43d2a;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      background: #e8ecef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
      color: var(--ink);
      cursor: pointer;
      font: inherit;
    }
    button:focus-visible { outline: 3px solid rgba(23, 111, 107, 0.28); outline-offset: 2px; }
    .game {
      display: grid;
      grid-template-columns: minmax(320px, 1fr) minmax(320px, 460px);
      gap: 20px;
      min-height: 100vh;
      padding: 20px;
    }
    .scene, .panel {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 18px 42px rgba(25, 35, 45, 0.16);
      overflow: hidden;
    }
    .scene { display: grid; grid-template-rows: auto 1fr auto; min-height: 620px; }
    .scene-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid var(--line);
      padding: 18px 20px;
    }
    .kicker { color: var(--sea); font-size: 12px; font-weight: 850; text-transform: uppercase; }
    h1 { font-size: 34px; line-height: 1.05; margin: 4px 0 0; }
    .status { display: flex; gap: 10px; align-items: center; color: var(--muted); font-weight: 700; }
    .badge {
      min-width: 80px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
      padding: 8px 10px;
      text-align: center;
    }
    .scene-art { align-self: center; justify-self: center; width: min(760px, 94%); padding: 20px; }
    .gate-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      border-top: 1px solid var(--line);
      padding: 14px 20px 20px;
    }
    .gate { height: 12px; border-radius: 999px; background: #d7dfdc; }
    .gate.open { background: var(--sea); }
    .panel { display: grid; grid-template-rows: auto auto 1fr auto; }
    .controls { display: flex; gap: 8px; padding: 18px 18px 0; }
    .difficulty { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; flex: 1; }
    .difficulty button, .restart { min-height: 40px; padding: 8px 10px; font-weight: 760; }
    .difficulty button.active { background: var(--sea); border-color: var(--sea); color: white; }
    .question-meta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 18px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 760;
    }
    .question { padding: 0 18px 18px; }
    .prompt { font-size: 26px; font-weight: 820; line-height: 1.16; margin: 0 0 18px; }
    .options { display: grid; gap: 10px; }
    .option { min-height: 52px; padding: 12px 14px; text-align: left; font-weight: 700; }
    .option.correct { background: rgba(23, 111, 107, 0.12); border-color: var(--sea); }
    .option.wrong { background: rgba(164, 61, 42, 0.1); border-color: var(--danger); }
    .feedback {
      min-height: 58px;
      border-top: 1px solid var(--line);
      padding: 14px 18px 18px;
      color: var(--muted);
      font-weight: 700;
    }
    .complete { display: none; padding: 0 18px 18px; }
    .complete.show { display: block; }
    .complete h2 { color: var(--sea); font-size: 28px; margin: 0 0 10px; }
    @media (max-width: 900px) {
      .game { grid-template-columns: 1fr; }
      .scene { min-height: auto; }
      .scene-art { width: min(620px, 100%); }
    }
  </style>
</head>
<body>
  <main class="game">
    <section class="scene">
      <header class="scene-header">
        <div>
          <div class="kicker">${escapeHtml(data.kicker || "Escape quiz")}</div>
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="status">
          <div class="badge" id="timer">10:00</div>
          <div class="badge" id="stars">0 stars</div>
        </div>
      </header>
      <div class="scene-art" aria-hidden="true">${data.scene_svg || ""}</div>
      <div class="gate-row" id="gates"></div>
    </section>
    <section class="panel">
      <div class="controls">
        <div class="difficulty" role="group" aria-label="Difficulty">
          <button data-difficulty="easy" class="active">Easy</button>
          <button data-difficulty="core">Core</button>
          <button data-difficulty="challenge">Challenge</button>
        </div>
        <button class="restart" id="restart">Reset</button>
      </div>
      <div class="question-meta">
        <span id="progress">Question 1 of ${data.questions.length}</span>
        <span id="level">Easy</span>
      </div>
      <div class="question" id="questionPanel">
        <p class="prompt" id="prompt"></p>
        <div class="options" id="options"></div>
      </div>
      <div class="complete" id="complete">
        <h2>Escape complete</h2>
        <p id="completeText"></p>
      </div>
      <div class="feedback" id="feedback">Choose an answer to unlock the first gate.</div>
    </section>
  </main>
  <script>
    const questions = ${JSON.stringify(data.questions)};
    window.__teacherGameQuestions = questions;
    const settings = ${JSON.stringify(settings)};
    let difficulty = "easy";
    let index = 0;
    let stars = 0;
    let secondsLeft = settings[difficulty].seconds;
    let timerId = null;
    let answered = false;

    const timer = document.getElementById("timer");
    const starsEl = document.getElementById("stars");
    const promptEl = document.getElementById("prompt");
    const optionsEl = document.getElementById("options");
    const progressEl = document.getElementById("progress");
    const levelEl = document.getElementById("level");
    const feedbackEl = document.getElementById("feedback");
    const gatesEl = document.getElementById("gates");
    const completeEl = document.getElementById("complete");
    const completeText = document.getElementById("completeText");
    const questionPanel = document.getElementById("questionPanel");

    function formatTime(seconds) {
      const min = Math.floor(seconds / 60).toString().padStart(2, "0");
      const sec = (seconds % 60).toString().padStart(2, "0");
      return min + ":" + sec;
    }
    function shuffledOptions(question) {
      const copy = [...question.options];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = (i + question.prompt.length) % copy.length;
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    function renderGates() {
      gatesEl.innerHTML = "";
      for (let i = 0; i < 5; i++) {
        const gate = document.createElement("div");
        gate.className = "gate" + (stars >= (i + 1) * 3 ? " open" : "");
        gatesEl.appendChild(gate);
      }
    }
    function renderQuestion() {
      const question = questions[index];
      answered = false;
      promptEl.textContent = question.prompt;
      progressEl.textContent = "Question " + (index + 1) + " of " + questions.length;
      levelEl.textContent = settings[difficulty].label;
      optionsEl.innerHTML = "";
      for (const option of shuffledOptions(question)) {
        const button = document.createElement("button");
        button.className = "option";
        button.textContent = option;
        button.addEventListener("click", () => answer(option, button));
        optionsEl.appendChild(button);
      }
      feedbackEl.textContent = "Choose an answer to unlock the next gate.";
      renderGates();
      timer.textContent = formatTime(secondsLeft);
      starsEl.textContent = stars + (stars === 1 ? " star" : " stars");
    }
    function answer(option, button) {
      if (answered) return;
      answered = true;
      const question = questions[index];
      const correct = option === question.answer;
      if (correct) {
        stars += 1;
        button.classList.add("correct");
        feedbackEl.textContent = "Correct. " + question.answer + " unlocked one star.";
      } else {
        button.classList.add("wrong");
        feedbackEl.textContent = "Not this time. Hint: " + question.hint;
      }
      [...optionsEl.children].forEach((child) => {
        if (child.textContent === question.answer) child.classList.add("correct");
      });
      starsEl.textContent = stars + (stars === 1 ? " star" : " stars");
      renderGates();
      setTimeout(nextQuestion, correct ? 700 : 1400);
    }
    function nextQuestion() {
      index += 1;
      if (index >= questions.length) finish();
      else renderQuestion();
    }
    function finish() {
      clearInterval(timerId);
      questionPanel.style.display = "none";
      completeEl.classList.add("show");
      completeText.textContent = "Score: " + stars + " out of " + questions.length + ".";
      feedbackEl.textContent = stars >= 12 ? "All gates are open." : "Review the source notes, then try again.";
      renderGates();
    }
    function tick() {
      secondsLeft -= 1;
      timer.textContent = formatTime(Math.max(secondsLeft, 0));
      if (secondsLeft <= 0) finish();
    }
    function reset(nextDifficulty = difficulty) {
      difficulty = nextDifficulty;
      index = 0;
      stars = 0;
      secondsLeft = settings[difficulty].seconds;
      questionPanel.style.display = "block";
      completeEl.classList.remove("show");
      document.querySelectorAll("[data-difficulty]").forEach((button) => {
        button.classList.toggle("active", button.dataset.difficulty === difficulty);
      });
      clearInterval(timerId);
      timerId = setInterval(tick, 1000);
      renderQuestion();
    }
    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => reset(button.dataset.difficulty));
    });
    document.getElementById("restart").addEventListener("click", () => reset());
    reset("easy");
  </script>
</body>
</html>
`;
}

function printableHtml(pack, data) {
  const title = `${pack.year_level || ""} ${data.title} Printable Quiz`.trim();
  const questions = data.questions.map((question, index) => `<section class="question">
  <h2>${index + 1}. ${escapeHtml(question.prompt)}</h2>
  <ol type="A">
    ${question.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("\n")}
  </ol>
  <p class="line">Answer: ______________________________</p>
</section>`).join("\n");
  const answers = data.questions.map((question, index) => `<li>${index + 1}. ${escapeHtml(question.answer)}</li>`).join("\n");

  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --ink: #202326; --muted: #5d666f; --sea: #176f6b; --paper: #fffdf8; --line: #d7dfdc; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e8ecef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.42;
    }
    .page {
      width: min(8.27in, calc(100% - 32px));
      min-height: 11.69in;
      margin: 24px auto;
      padding: 0.58in 0.62in;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 18px 42px rgba(25, 35, 45, 0.16);
    }
    .kicker { color: var(--sea); font-size: 12px; font-weight: 850; text-transform: uppercase; }
    h1 { font-size: 28px; line-height: 1.12; margin: 4px 0 16px; border-bottom: 3px solid var(--sea); padding-bottom: 10px; }
    h2 { font-size: 16px; margin: 0 0 6px; }
    .question { break-inside: avoid; border-bottom: 1px solid var(--line); padding: 10px 0; }
    ol { margin: 5px 0 8px 24px; padding: 0; }
    li { margin: 3px 0; }
    .line { color: var(--muted); margin: 8px 0 0; }
    .answer-key { break-before: page; }
    @page { size: A4; margin: 0; }
    @media print {
      body { background: white; }
      .page { width: 8.27in; min-height: 11.69in; margin: 0; border: 0; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <main class="page" contenteditable="true">
    <div class="kicker">Printable fallback</div>
    <h1>${escapeHtml(title)}</h1>
    <p>Name: ______________________________ Date: __________________</p>
    ${questions}
  </main>
  <main class="page answer-key">
    <div class="kicker">Teacher answer key</div>
    <h1>${escapeHtml(title)} Answer Key</h1>
    <ol>${answers}</ol>
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

function upsertManifestGameFile(manifest, data) {
  const dir = data.output.directory;
  const block = `## Game Files
- escape quiz game: \`${dir}/${data.output.game_html}\`
- printable quiz fallback HTML: \`${dir}/${data.output.printable_html}\`
- printable quiz fallback PDF: \`${dir}/${data.output.printable_pdf}\`
`;

  const refreshed = manifest
    .replace("| Escape game | not included | Phase C enhancement. |", "| Escape game | ready | Single-file classroom escape quiz and printable fallback available in `games/`. |")
    .replace("| Escape game | ready | Single-file classroom escape quiz available in `games/`. |", "| Escape game | ready | Single-file classroom escape quiz and printable fallback available in `games/`. |");

  if (refreshed.match(/\n## Game Files\n/)) {
    return refreshed.replace(/\n## Game Files\n[\s\S]*?(?=\n## |\s*$)/, `\n${block}`);
  }
  return `${refreshed.trim()}\n\n${block}`;
}

async function exportPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage({ viewport: { width: 960, height: 1280 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
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

  const gameHtmlPath = path.join(outDir, data.output.game_html);
  const printableHtmlPath = path.join(outDir, data.output.printable_html);
  const printablePdfPath = path.join(outDir, data.output.printable_pdf);

  await fs.writeFile(gameHtmlPath, gameHtml(pack, data), "utf8");
  await fs.writeFile(printableHtmlPath, printableHtml(pack, data), "utf8");

  const browserExecutable = findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  });
  try {
    await exportPdf(browser, printableHtmlPath, printablePdfPath);
  } finally {
    await browser.close();
  }

  upsertArtifact(pack, {
    artifact_id: `${artifactIdFromFile(data.output.game_html)}-game`,
    type: "escape_quiz_game",
    status: "ready",
    path: `${data.output.directory}/${data.output.game_html}`,
    template_id: data.template_id,
    source_artifact_id: data.source_artifact_id,
    notes: ["Single-file classroom quiz game generated from generic escape-quiz adapter data."],
  });
  upsertArtifact(pack, {
    artifact_id: artifactIdFromFile(data.output.printable_html),
    type: "escape_quiz_printable_html",
    status: "ready",
    path: `${data.output.directory}/${data.output.printable_html}`,
    template_id: "escape_quiz_printable_fallback",
    source_artifact_id: data.source_artifact_id,
    notes: ["Printable fallback quiz generated from the same question data."],
  });
  upsertArtifact(pack, {
    artifact_id: artifactIdFromFile(data.output.printable_pdf),
    type: "escape_quiz_printable_pdf",
    status: "ready",
    path: `${data.output.directory}/${data.output.printable_pdf}`,
    template_id: "escape_quiz_printable_fallback",
    source_artifact_id: data.source_artifact_id,
    notes: ["Printable fallback quiz PDF generated from the same question data."],
  });

  pack.templates ??= {};
  pack.templates.game = data.template_id;
  for (const assumption of pack.assumptions || []) {
    if (assumption.field === "game") {
      assumption.value = "included as Phase C escape quiz game";
      assumption.reason = "Phase C enhancement generated by generic escape-quiz adapter";
    }
  }

  upsertCheck(pack, "generic_escape_quiz_adapter", "pass");
  upsertCheck(pack, "phase_c_escape_quiz_game", "pass");
  upsertCheck(pack, "game_question_count", data.questions.length >= 1 ? "pass" : "fail");
  upsertCheck(pack, "printable_game_fallback", "pass");
  setAutomatedQaStatus(pack);

  pack.qa.notes ??= [];
  const note = "Phase C escape quiz game and printable fallback generated with generic escape-quiz adapter.";
  if (!pack.qa.notes.includes(note)) pack.qa.notes.push(note);

  await fs.writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  const manifest = await fs.readFile(manifestPath, "utf8");
  await fs.writeFile(manifestPath, upsertManifestGameFile(manifest, data), "utf8");

  console.log(`Rendered escape quiz adapter outputs in ${outDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
