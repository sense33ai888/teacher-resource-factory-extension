---
name: teacher-vault-artifact-publisher
description: Publish finished teacher-facing artifacts into the teacher's own vault Resources folders with zero content judgement, coarse type-based placement, prompt-derived filenames, and hidden .ai-original same-name copies for later teacher-edit diffs.
---

# Teacher Vault Artifact Publisher

## Use When

- A teacher-facing agent has created a finished file artifact: slides, worksheet, poster, report, document, lesson plan, or an uncertain artifact.
- The artifact should be available to the teacher in their main vault, separate from runtime evidence and capture episodes.
- A later offline distillation pass should be able to compare the AI original against the teacher-edited final file.

Do not use this for chat-only advice with no file artifact.

## Hard Boundary

This skill does not judge content.

- Do not classify by topic, subject, year level, quality, privacy, curriculum, or usefulness.
- Do not modify capture-pure prompt or AI-output capture.
- Do not compute diffs.
- Do not write into `teacher-work/` or `06 Agent Runtime/`.
- Do not copy raw teacher/student content into reusable skill material.

## Destination

Resolve the teacher vault from `TEACHER-VAULT.json`, then verify its `state_path`.

Write finished artifacts under:

```text
<teacher-vault>/Resources/
  Slides/
  Worksheets/
  Posters/
  Reports/
  Documents/
  Lesson-Plans/
  Other/
```

The directory is chosen only from the artifact type the agent already knows. Unknown or unsupported types go to `Other/`; never guess.

## Filename Rule

Use:

```text
<about-from-teacher-prompt>-<artifact-type>-<YYYYMMDD>.<ext>
```

- `about-from-teacher-prompt` comes from direct teacher prompt words, or `untitled` if unavailable.
- The date is local date and stays at the end of the filename stem.
- If the same name already exists and differs, add `v2`, `v3`, etc. before the date, for example `volcano-slides-v2-20260601.html`.

## AI Original Copy

For every published artifact, save the AI original in a hidden child folder under the same coarse type directory:

```text
<teacher-vault>/Resources/Worksheets/
  volcanoes-worksheet-20260601.md
  volcanoes-worksheet-20260601.pdf
  .ai-original/
    volcanoes-worksheet-20260601.md
    volcanoes-worksheet-20260601.pdf
```

The product filename stays clean and never contains `.ai-original`. The original filename exactly matches the product filename; only the directory differs. Keep originals for every format, including PDF.

## Commands

Publish one file:

```text
node scripts/publish-teacher-artifact.mjs \
  --input /path/to/file.md \
  --artifact-type worksheet \
  --prompt "Make a photosynthesis worksheet"
```

Publish a resource pack from `resource_pack.json` artifacts:

```text
node scripts/publish-teacher-artifact.mjs \
  --pack-dir /path/to/resource-pack \
  --prompt "Make a Year 6 persuasive writing resource pack"
```

Use `--about <direct-prompt-keywords>` when the calling agent has already extracted the prompt keywords.

## Verification

Before finishing, confirm:

- The product file is in `<teacher-vault>/Resources/<coarse-type>/`.
- The filename includes prompt-derived `about`, type, and date.
- A same-name original exists in `<teacher-vault>/Resources/<coarse-type>/.ai-original/`.
- Unknown types land in `Other/`.
- No capture-pure episode fields or capture hooks changed.
