---
name: teacher-resource-pack-generator
description: Generate a classroom-ready teacher resource pack from an approved briefing or structured teaching intent, including slides, worksheet, answer key, teacher notes, assumptions/source notes, pack manifest, and resource_pack.json. Use after teacher-resource-pack-briefing has produced a content brief, template plan, source gate, and generation inputs, or when continuing an already-briefed lesson/resource pack.
---

# Teacher Resource Pack Generator

## Use When

- `teacher-resource-pack-briefing` has already produced a content brief, assumptions, template plan, source gate, and generation inputs.
- A teacher asks for a lesson/resource pack, not only a single artifact.
- The requested output should include slides plus worksheet/practice material.
- The task needs visible assumptions, answer key alignment, teacher notes, or a reusable `resource_pack.json`.
- The user mentions Chalkie parity, TeacherGPT parity, classroom resource factory, resource pack, lesson pack, or Core Teaching Pack.

## Do Not Use When

- The teacher only wants a short text rewrite.
- The task is live Google Docs/Sheets editing; use the relevant owned skill after this pack is planned.
- The task requires raw sensitive student/parent data without a clear private evidence boundary.
- The teacher explicitly asks only for high-end visual design, animation, or demo polish; route that separately.

## MVP-A Output

Generate the Core Teaching Pack first:

```text
lesson-slides source or outline
rendered editable slides HTML/PDF when runtime is available
worksheet
rendered printable worksheet HTML/PDF when runtime is available
answer key
teacher notes
assumptions/source notes
pack-manifest.md
resource_pack.json
```

Visual pairs are Phase B enhancements. Escape quiz games are Phase C enhancements.

## Upstream Briefing Gate

Before creating slides or artifacts from a raw teacher request, run `teacher-resource-pack-briefing`.

The generator should consume the briefing output:

```text
content brief
editable assumptions
template plan
source grounding / acquisition gate
generation inputs
visual handoff candidates
pre-render QA
```

If a factual pack has `source_grounding_status: missing` or `source_missing_blocking`, do not generate final factual slide/worksheet wording until sources are attached or the artifact remains explicitly source/review-gated.

If no briefing is available, generate one inline using the same rules: infer low-risk defaults, ask only blocking questions, and record assumptions visibly.

## Workflow

1. Consume or create a pre-generation briefing: topic, year level, subject, learning goal, assumptions, source gate, template plan, and requested artifacts.
2. Confirm the source gate does not block final factual wording, or mark the affected artifacts source/review-gated.
3. Select the pack shape and templates from the briefing plan.
4. Generate structured pack content before rendering any final artifact.
5. Produce aligned student-facing worksheet and answer key together.
6. Write `pack-manifest.md` as the teacher-facing entry point.
7. Write `resource_pack.json` with assumptions, templates, artifact statuses, and review notes.
8. When the local runtime is available, run `scripts/render-mvp-a-pack.mjs <pack-dir>` to produce editable/printable HTML and PDF exports.
9. Run `scripts/render-teacher-preview-index.mjs <pack-dir>` so the teacher has one entry point.
10. Run `scripts/validate-resource-pack.mjs <pack-dir>` and fix blocking issues.
11. Run the QA and failure policy in `references/qa-and-failure-policy.md`.
12. Publish finished pack artifacts into the teacher's main vault with `teacher-vault-artifact-publisher`; this creates the teacher-facing copy plus same-name originals under each type folder's `.ai-original/` directory for later offline diffing.
13. If meaningful, call teacher evidence capture after the pack is accepted or reviewed.

## Template Expansion Gate

Phase 1 is adapter extraction only. Do not add any new pack recipe, teaching template, visual template family, or game template family until both required benchmarks pass.

Required order:

```text
1. Use the generic labelled-diagram adapter, not a topic-specific script.
2. Use the generic escape-quiz adapter, not a topic-specific script.
3. Rerender the volcano benchmark using the generic adapters.
4. Run the Year 6 persuasive writing non-diagram benchmark.
5. Only after both unlike benchmarks pass, consider template expansion.
```

For topics that do not naturally need a labelled diagram, do not force one. Mark the visual pair as not applicable, or record an anchor-chart/checklist template gap for later.

## Phase B Visual Pair

When the core pack is stable and the topic benefits from a diagram or image-based worksheet, generate one visual pair before games:

```text
labelled concept diagram
blank labelling worksheet
```

Use the generic adapter with a topic data file:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-resource-pack-generator/scripts/render-labelled-diagram.mjs" <pack-dir> <diagram-data.json>
```

Volcano benchmark data:

```text
data/volcano-labelled-diagram.json
```

## Phase C Escape Quiz Game

When MVP-A and the Phase B visual pair are usable, generate one self-contained classroom game:

```text
escape_quiz_game
```

Use the generic adapter with a topic question data file:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-resource-pack-generator/scripts/render-escape-quiz.mjs" <pack-dir> <quiz-data.json>
```

Volcano benchmark data:

```text
data/volcano-escape-quiz.json
```

## Template Set

For MVP-A, use only the frozen templates in:

```text
references/mvp-a-templates.md
```

Do not create new templates during normal generation. If none fit, use the closest template and note the gap.

## Required References

- Schemas and manifest format: `references/phase-0-schemas.md`
- MVP-A template library: `references/mvp-a-templates.md`
- QA, failure, and budget rules: `references/qa-and-failure-policy.md`

## Render Utility

Use this utility after the Markdown source files exist:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-resource-pack-generator/scripts/render-mvp-a-pack.mjs" <pack-dir>
```

It writes `renders/lesson-slides.html`, `renders/lesson-slides.pdf`, `renders/worksheet.html`, and `renders/worksheet.pdf`, then updates `pack-manifest.md` and `resource_pack.json`.

## Preview And Validation Utilities

After rendering/enhancements, generate the teacher preview index:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-resource-pack-generator/scripts/render-teacher-preview-index.mjs" <pack-dir>
```

Then validate the pack:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-resource-pack-generator/scripts/validate-resource-pack.mjs" <pack-dir>
```

`qa.status` is for automated checks only. Keep `source_grounding_status` and `classroom_review_status` separate so teacher review does not blur automated QA.

## Teacher Vault Publish Utility

After rendering, preview, and validation, publish the finished artifacts to the teacher's own vault:

```text
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}" \
node "$OPENCLAW_WORKSPACE/owned-skills/skills/teacher-vault-artifact-publisher/scripts/publish-teacher-artifact.mjs" \
  --pack-dir <pack-dir> \
  --prompt "<original teacher prompt>"
```

This publish step must derive the vault from `TEACHER-VAULT.json`, use only artifact type for coarse placement, and leave capture-pure episode behavior unchanged.

## Output Rules

- Show assumptions clearly.
- Mark AI-generated facts/questions as teacher-review-required unless grounded in teacher-owned or trusted public material.
- Do not mark `factual_safety` as a plain pass without trusted source grounding. Prefer `source_grounding_status` plus `classroom_review_status`.
- Keep student-facing wording age-appropriate and classroom-safe.
- Do not fail the whole pack if one artifact fails; deliver the usable subset and mark statuses.
- Do not persist raw sensitive student/teacher data into common templates or shared skill material.
- Finished file artifacts should be published to the teacher's main vault `Resources/` area with same-name AI originals under each type folder's `.ai-original/` directory; do not use `teacher-work/` or `06 Agent Runtime/` for teacher-facing product copies.

## First Benchmark

Use this benchmark before broader rollout:

```text
Make a Year 4 Forces of Nature resource pack about volcanoes.
```

Pass condition: slides, worksheet, answer key, teacher notes, manifest, and `resource_pack.json` are coherent and usable within 5 minutes of teacher review.

## Second Benchmark Gate

Before promotion or template expansion, run:

```text
Make a Year 6 persuasive writing resource pack.
```

Pass condition: the pack renders and validates without inventing a labelled diagram. If the current renderer cannot parse the slide source, fix the parser structurally instead of rewriting the benchmark to match the first sample.
