---
name: teacher-resource-pack-briefing
description: Turns a short teacher request into a pre-generation content brief, safe assumptions, template plan, source gate, QA notes, and visual handoff plan before slides or artifacts are created. Use when a teacher asks for a lesson/resource pack, Chalkie/TeacherGPT-style pack, slides plus worksheet, or when generation must first clarify intent without running a fixed questionnaire.
---

# Teacher Resource Pack Briefing

## Purpose

Run this before creating slides, worksheets, games, or visual resources.

Turn a teacher's short request into:

```text
content brief
editable assumptions
template plan
source grounding / acquisition gate
generation inputs
visual handoff candidates
pre-render QA
```

This is not a slide renderer and does not create final classroom artifacts.

## Boundaries

Do:

```text
infer low-risk defaults
record assumptions as editable
ask only blocking questions
choose existing template families
separate qa.status, source_grounding_status, and classroom_review_status
mark non-diagram topics as not_applicable or anchor-chart/checklist candidates
```

Do not:

```text
ask a fixed questionnaire
merge canonical skills
create new template families
render OpenDesign HTML
generate final slides/worksheets/games
mark classroom review approved
mark factual_safety pass without source grounding
copy Chalkie/TeacherGPT content, art, story, UI, or layouts
```

## Workflow

1. Normalize the teacher request into structured intent.
2. Decide whether to ask, infer, or mark missing.
3. Write editable assumptions for low-risk missing fields.
4. Choose the smallest existing template route.
5. Run the source grounding planner.
6. Run the source acquisition gate for factual topics.
7. Create generation inputs for lesson, worksheet, answer key, teacher notes, and optional game.
8. Create visual handoff candidates without rendering.
9. Run pre-render QA.
10. Return a brief with blocking issues and next actions.

Use [references/prompt-pipeline.md](references/prompt-pipeline.md) for the detailed prompts, schemas, routing rules, and dry-run findings.

## Output Contract

Return Markdown plus JSON blocks for:

```text
briefing verdict
normalized_intent
assumptions
pack_plan
source_gate
generation_inputs
visual_handoff_candidates
pre_render_qa
blocking issues and next actions
```

## Default Behavior

Do not ask every possible question. Ask only when missing information changes quality, safety, source grounding, template choice, or classroom usefulness.

Examples:

```text
Volcanoes -> concept lesson, scaffolded worksheet, source gate, labelled-diagram candidate.
Persuasive writing -> strategy lesson, scaffolded worksheet, rubric answer key, labelled diagram not_applicable.
```

## Handoff

If briefing passes, hand the output to `teacher-resource-pack-generator` or the content generation agent.

If factual source grounding is missing, do not generate final factual slide wording until sources are attached or the artifact remains explicitly source/review-gated.
