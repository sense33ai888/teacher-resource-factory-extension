#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const packDir = process.argv[2];

if (!packDir) {
  console.error("Usage: render-teacher-preview-index.mjs <pack-dir>");
  process.exit(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusTone(status) {
  if (status === "ready" || status === "pass" || status === "approved_for_classroom") return "good";
  if (status === "pending_teacher_review" || status === "source_notes_present" || status === "partial") return "warn";
  if (status === "missing" || status === "fail" || status === "failed") return "bad";
  return "neutral";
}

function upsertArtifact(pack, artifact) {
  const index = pack.artifacts.findIndex((item) => item.artifact_id === artifact.artifact_id);
  if (index === -1) pack.artifacts.push(artifact);
  else pack.artifacts[index] = { ...pack.artifacts[index], ...artifact };
}

function upsertManifestPreview(manifest) {
  const block = `## Teacher Preview
- preview index: \`index.html\`
`;

  if (manifest.match(/\n## Teacher Preview\n/)) {
    return manifest.replace(/\n## Teacher Preview\n[\s\S]*?(?=\n## |\s*$)/, `\n${block}`);
  }

  const filesSection = "\n## Files\n";
  if (manifest.includes(filesSection)) {
    return manifest.replace(filesSection, `\n${block}\n## Files\n`);
  }

  return `${manifest.trim()}\n\n${block}`;
}

function renderIndex(pack) {
  const artifacts = [...(pack.artifacts || [])].sort((a, b) => {
    const left = `${a.type || ""}:${a.artifact_id || ""}`;
    const right = `${b.type || ""}:${b.artifact_id || ""}`;
    return left.localeCompare(right);
  });

  const artifactRows = artifacts.map((artifact) => `<tr>
  <td>${escapeHtml(artifact.type)}</td>
  <td><a href="${escapeHtml(artifact.path)}">${escapeHtml(artifact.artifact_id)}</a></td>
  <td><span class="pill ${statusTone(artifact.status)}">${escapeHtml(artifact.status)}</span></td>
  <td>${escapeHtml((artifact.notes || []).join(" "))}</td>
</tr>`).join("\n");

  const qaRows = (pack.qa?.checks || []).map((check) => `<tr>
  <td>${escapeHtml(check.name)}</td>
  <td><span class="pill ${statusTone(check.status)}">${escapeHtml(check.status)}</span></td>
</tr>`).join("\n");

  const sourceRows = (pack.sources || []).map((source) => `<tr>
  <td>${escapeHtml(source.source_type)}</td>
  <td>${source.source_ref ? `<a href="${escapeHtml(source.source_ref)}">${escapeHtml(source.source_ref)}</a>` : "n/a"}</td>
  <td>${escapeHtml(source.usage)}</td>
  <td><span class="pill ${source.review_required ? "warn" : "good"}">${source.review_required ? "review required" : "trusted"}</span></td>
</tr>`).join("\n");

  const sourceStatus = pack.source_grounding_status || {};
  const reviewStatus = pack.classroom_review_status || {};

  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pack.year_level)} ${escapeHtml(pack.topic)} Resource Pack</title>
  <style>
    :root {
      --ink: #202326;
      --muted: #5d666f;
      --paper: #fffdf8;
      --sea: #176f6b;
      --line: #d7dfdc;
      --warn: #a86612;
      --bad: #a43d2a;
      --good: #176f6b;
      --soft: #eef5f3;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e8ecef;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 24px auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 18px 42px rgba(25, 35, 45, 0.16);
      overflow: hidden;
    }
    header {
      padding: 28px 32px;
      border-bottom: 1px solid var(--line);
    }
    .kicker {
      color: var(--sea);
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
    }
    h1 {
      font-size: 36px;
      line-height: 1.08;
      margin: 6px 0 10px;
    }
    .summary {
      color: var(--muted);
      margin: 0;
      max-width: 780px;
    }
    section {
      padding: 24px 32px;
      border-bottom: 1px solid var(--line);
    }
    h2 {
      font-size: 20px;
      margin: 0 0 14px;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .status-card {
      background: white;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px 16px;
    }
    .label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .value {
      margin-top: 4px;
      font-size: 17px;
      font-weight: 780;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: var(--soft);
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    a { color: var(--sea); font-weight: 750; text-decoration: none; }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .good { background: rgba(23, 111, 107, 0.12); color: var(--good); }
    .warn { background: rgba(168, 102, 18, 0.12); color: var(--warn); }
    .bad { background: rgba(164, 61, 42, 0.12); color: var(--bad); }
    .neutral { background: var(--soft); color: var(--muted); }
    @media (max-width: 760px) {
      main { width: calc(100% - 20px); margin: 10px auto; }
      header, section { padding: 18px; }
      .status-grid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="kicker">Teacher preview</div>
      <h1>${escapeHtml(pack.year_level)} ${escapeHtml(pack.topic)} Resource Pack</h1>
      <p class="summary">${escapeHtml(pack.learning_goal)}</p>
    </header>
    <section>
      <h2>Status</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="label">Automated QA</div>
          <div class="value"><span class="pill ${statusTone(pack.qa?.status)}">${escapeHtml(pack.qa?.status)}</span></div>
        </div>
        <div class="status-card">
          <div class="label">Source Grounding</div>
          <div class="value"><span class="pill ${statusTone(sourceStatus.status)}">${escapeHtml(sourceStatus.status)}</span></div>
        </div>
        <div class="status-card">
          <div class="label">Classroom Review</div>
          <div class="value"><span class="pill ${statusTone(reviewStatus.status)}">${escapeHtml(reviewStatus.status)}</span></div>
        </div>
      </div>
    </section>
    <section>
      <h2>Artifacts</h2>
      <table>
        <thead><tr><th>Type</th><th>File</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>${artifactRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Automated Checks</h2>
      <table>
        <thead><tr><th>Check</th><th>Status</th></tr></thead>
        <tbody>${qaRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Sources</h2>
      <table>
        <thead><tr><th>Type</th><th>Source</th><th>Usage</th><th>Review</th></tr></thead>
        <tbody>${sourceRows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  const absolutePackDir = path.resolve(packDir);
  const packPath = path.join(absolutePackDir, "resource_pack.json");
  const manifestPath = path.join(absolutePackDir, "pack-manifest.md");
  const pack = JSON.parse(await fs.readFile(packPath, "utf8"));

  pack.artifacts ??= [];
  upsertArtifact(pack, {
    artifact_id: "teacher-preview-index",
    type: "teacher_preview_index",
    status: "ready",
    path: "index.html",
    template_id: "teacher-preview-index-v1",
    notes: ["Single teacher-facing entry point for pack artifacts, QA, source grounding, and classroom review status."],
  });

  await fs.writeFile(path.join(absolutePackDir, "index.html"), renderIndex(pack), "utf8");
  await fs.writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  const manifest = await fs.readFile(manifestPath, "utf8");
  await fs.writeFile(manifestPath, upsertManifestPreview(manifest), "utf8");

  console.log(`Rendered teacher preview index at ${path.join(absolutePackDir, "index.html")}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
