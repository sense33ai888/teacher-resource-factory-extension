#!/usr/bin/env node
import { constants, existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const args = parseArgs(process.argv.slice(2));

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

function fail(message) {
  console.error(message);
  process.exit(1);
}

function localDateYYYYMMDD() {
  if (typeof args.date === "string") {
    if (!/^\d{8}$/.test(args.date)) fail("--date must be YYYYMMDD");
    return args.date;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function extractAboutFromPrompt(prompt) {
  if (!prompt) return "untitled";

  const aboutMatch = String(prompt).match(/\babout\s+([^.,;:\n]+)/i);
  const sourceText = aboutMatch?.[1] || prompt;
  const tokens = sourceText
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[\p{Letter}\p{Number}]+/gu) || [];

  const stop = new Set([
    "a", "an", "and", "about", "as", "at", "for", "from", "in", "into", "of", "on", "please", "the", "to", "with",
    "make", "create", "generate", "build", "draft", "write", "produce", "prepare",
    "year", "level", "class", "student", "students", "teacher", "teaching",
    "resource", "pack", "lesson", "slides", "slide", "worksheet", "worksheets", "poster", "posters",
    "report", "reports", "document", "documents", "doc", "docx", "pdf", "html", "markdown", "md",
  ]);

  const keywords = tokens
    .filter((token) => !stop.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .slice(0, 4);

  return slugify(keywords.join("-") || "untitled");
}

function normalizeType(type) {
  return slugify(type).replaceAll("_", "-");
}

function classifyArtifactType(type) {
  const normalized = normalizeType(type || "other");

  const exact = {
    slide: ["Slides", "slides"],
    slides: ["Slides", "slides"],
    worksheet: ["Worksheets", "worksheet"],
    worksheets: ["Worksheets", "worksheet"],
    homework: ["Worksheets", "homework"],
    "exit-ticket": ["Worksheets", "exit-ticket"],
    "exit-tickets": ["Worksheets", "exit-ticket"],
    poster: ["Posters", "poster"],
    posters: ["Posters", "poster"],
    report: ["Reports", "report"],
    reports: ["Reports", "report"],
    document: ["Documents", "document"],
    documents: ["Documents", "document"],
    doc: ["Documents", "document"],
    "lesson-plan": ["Lesson-Plans", "lesson-plan"],
    "lesson-plans": ["Lesson-Plans", "lesson-plan"],
    other: ["Other", "other"],
  };
  if (exact[normalized]) return { folder: exact[normalized][0], fileType: exact[normalized][1] };

  if (normalized.includes("lesson-plan")) return { folder: "Lesson-Plans", fileType: "lesson-plan" };
  if (normalized.includes("slide")) return { folder: "Slides", fileType: "slides" };
  if (normalized.includes("answer-key")) return { folder: "Documents", fileType: "answer-key" };
  if (normalized.includes("source-note")) return { folder: "Documents", fileType: "source-notes" };
  if (normalized.includes("teacher-note")) return { folder: "Documents", fileType: "teacher-notes" };
  if (normalized.includes("manifest")) return { folder: "Documents", fileType: "manifest" };
  if (normalized.includes("preview") || normalized.includes("index")) return { folder: "Documents", fileType: "preview" };
  if (normalized.includes("game") || normalized.includes("quiz")) {
    return { folder: "Other", fileType: normalized.includes("printable") ? "game-printable" : "game" };
  }
  if (normalized.includes("report")) return { folder: "Reports", fileType: "report" };
  if (normalized.includes("homework")) return { folder: "Worksheets", fileType: "homework" };
  if (normalized.includes("exit-ticket") || normalized.includes("exit-slip") || normalized.includes("quick-check")) return { folder: "Worksheets", fileType: "exit-ticket" };
  if (normalized.includes("labelling") || normalized.includes("labeling")) return { folder: "Worksheets", fileType: "labelling-worksheet" };
  if (normalized.includes("worksheet")) return { folder: "Worksheets", fileType: "worksheet" };
  if (normalized.includes("poster")) return { folder: "Posters", fileType: "poster" };
  if (normalized.includes("diagram")) return { folder: "Posters", fileType: "poster" };
  if (normalized.includes("document") || normalized.includes("doc")) return { folder: "Documents", fileType: "document" };

  return { folder: "Other", fileType: "other" };
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

function parentDirs(startPath) {
  const dirs = [];
  let current = path.resolve(startPath);
  if (path.extname(current)) current = path.dirname(current);
  while (true) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

async function findTeacherVaultConfig(seedPaths) {
  const explicit = args["teacher-vault-config"] || args.config || process.env.TEACHER_VAULT_CONFIG;
  if (explicit) return path.resolve(explicit);

  const seen = new Set();
  for (const seed of seedPaths.filter(Boolean)) {
    for (const dir of parentDirs(seed)) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const candidate = path.join(dir, "TEACHER-VAULT.json");
      if (existsSync(candidate)) return candidate;
    }
  }

  fail("TEACHER-VAULT.json not found. Pass --teacher-vault-config or run from inside a teacher agent workspace.");
}

async function resolveTeacherVault(seedPaths) {
  const configPath = await findTeacherVaultConfig(seedPaths);
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (!config.teacher_vault_path) fail(`${configPath}: teacher_vault_path missing`);
  if (!config.state_path) fail(`${configPath}: state_path missing`);

  const state = JSON.parse(await fs.readFile(config.state_path, "utf8"));
  if (!state.teacher_vault_path) fail(`${config.state_path}: teacher_vault_path missing`);

  const pointerVault = path.resolve(config.teacher_vault_path);
  const stateVault = path.resolve(state.teacher_vault_path);
  if (pointerVault !== stateVault) {
    fail(`Teacher vault pointer mismatch: TEACHER-VAULT.json=${pointerVault}; state.json=${stateVault}`);
  }

  return { teacherVaultPath: stateVault, configPath, statePath: config.state_path };
}

async function chooseTargetPaths(destDir, aboutSlug, fileType, date, ext, sourcePath) {
  const sourceHash = await hashFile(sourcePath);

  for (let version = 1; version < 1000; version += 1) {
    const versionPart = version === 1 ? "" : `-v${version}`;
    const stem = `${aboutSlug}-${fileType}${versionPart}-${date}`;
    const filename = `${stem}${ext}`;
    const targetPath = path.join(destDir, filename);
    const aiOriginalPath = path.join(destDir, ".ai-original", filename);

    const targetExists = await fileExists(targetPath);
    const originalExists = await fileExists(aiOriginalPath);
    if (!targetExists && !originalExists) return { targetPath, aiOriginalPath, sourceHash, reused: false };

    const targetSame = targetExists && (await hashFile(targetPath)) === sourceHash;
    const originalSame = originalExists && (await hashFile(aiOriginalPath)) === sourceHash;
    if (targetSame && (!originalExists || originalSame)) {
      return { targetPath, aiOriginalPath, sourceHash, reused: true };
    }
  }

  fail(`Could not choose a non-conflicting filename in ${destDir}`);
}

async function copyIfNeeded(sourcePath, targetPath) {
  if (await fileExists(targetPath)) return;
  await fs.copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
}

async function loadPackEntries(packDir) {
  const packPath = path.join(packDir, "resource_pack.json");
  const pack = JSON.parse(await fs.readFile(packPath, "utf8"));
  const entries = [];

  for (const artifact of pack.artifacts || []) {
    if (artifact.status && !["ready", "pass", "approved_for_classroom"].includes(artifact.status)) continue;
    if (!artifact.path) continue;
    const sourcePath = path.resolve(packDir, artifact.path);
    if (!(await fileExists(sourcePath))) continue;
    entries.push({
      sourcePath,
      artifactType: artifact.type || artifact.artifact_id || "other",
      artifactId: artifact.artifact_id || null,
      packRelativePath: artifact.path,
    });
  }

  return { pack, packPath, entries };
}

async function publishEntry(entry, resourcesRoot, aboutSlug, date) {
  const classification = classifyArtifactType(entry.artifactType);
  const destDir = path.join(resourcesRoot, classification.folder);
  await fs.mkdir(destDir, { recursive: true });

  const ext = path.extname(entry.sourcePath) || ".txt";
  const { targetPath, aiOriginalPath, sourceHash, reused } = await chooseTargetPaths(
    destDir,
    aboutSlug,
    classification.fileType,
    date,
    ext,
    entry.sourcePath,
  );

  await fs.mkdir(path.dirname(aiOriginalPath), { recursive: true });
  await copyIfNeeded(entry.sourcePath, targetPath);
  await copyIfNeeded(entry.sourcePath, aiOriginalPath);

  return {
    artifact_id: entry.artifactId,
    artifact_type: entry.artifactType,
    source_path: entry.sourcePath,
    source_pack_relative_path: entry.packRelativePath || null,
    destination_folder: classification.folder,
    filename_type: classification.fileType,
    published_path: targetPath,
    ai_original_path: aiOriginalPath,
    source_sha256: sourceHash,
    reused_existing_identical_file: reused,
  };
}

async function main() {
  const date = localDateYYYYMMDD();
  const seedPaths = [args["pack-dir"], args.input, process.cwd()];
  const { teacherVaultPath, configPath, statePath } = await resolveTeacherVault(seedPaths);
  const resourcesRoot = path.join(teacherVaultPath, "Resources");
  const aboutSlug = slugify(args.about || extractAboutFromPrompt(args.prompt || ""));

  let entries = [];
  let pack = null;
  let packPath = null;
  let manifestOut = args["manifest-out"] ? path.resolve(args["manifest-out"]) : null;

  if (args["pack-dir"]) {
    const packDir = path.resolve(args["pack-dir"]);
    const loaded = await loadPackEntries(packDir);
    pack = loaded.pack;
    packPath = loaded.packPath;
    entries = loaded.entries;
    manifestOut ??= path.join(packDir, "teacher-vault-publish.json");
  } else if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!(await fileExists(inputPath))) fail(`Input file not found: ${inputPath}`);
    entries = [{
      sourcePath: inputPath,
      artifactType: args["artifact-type"] || "other",
      artifactId: null,
      packRelativePath: null,
    }];
  } else {
    fail("Usage: publish-teacher-artifact.mjs --input <file> --artifact-type <type> --prompt <prompt> OR --pack-dir <dir> --prompt <prompt>");
  }

  if (!entries.length) fail("No publishable file artifacts found.");

  const published = [];
  for (const entry of entries) {
    published.push(await publishEntry(entry, resourcesRoot, aboutSlug, date));
  }

  const manifest = {
    published_at: new Date().toISOString(),
    policy: "zero_content_judgement_type_only_publish",
    teacher_vault_config_ref: configPath,
    teacher_vault_state_ref: statePath,
    teacher_vault_path: teacherVaultPath,
    resources_root: resourcesRoot,
    about_slug: aboutSlug,
    date,
    entries: published,
  };

  if (manifestOut) {
    await fs.writeFile(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  if (pack && packPath) {
    pack.teacher_vault_publish = {
      status: "published",
      policy: manifest.policy,
      manifest_path: path.relative(path.dirname(packPath), manifestOut),
      resources_root: resourcesRoot,
      published_count: published.length,
      updated_at: manifest.published_at,
    };
    await fs.writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    status: "published",
    resources_root: resourcesRoot,
    about_slug: aboutSlug,
    published_count: published.length,
    manifest_path: manifestOut,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
