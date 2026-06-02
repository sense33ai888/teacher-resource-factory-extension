# Teacher Resource Pack Briefing Prompt Pipeline

This reference operationalizes the pre-generation briefing layer from the internal Teacher Resource Pack Prompt Pipeline v1 design notes.

```text
source design: teacher-resource-pack-prompt-pipeline-v1
```

Dry-run evidence:

```text
teacher-resource-pack-prompt-pipeline-dry-run-volcano-v1
teacher-resource-pack-prompt-pipeline-dry-run-persuasive-writing-v1
teacher-resource-pack-prompt-pipeline-dry-run-review-v1
```

## Core Rule

This is not a fixed questionnaire.

```text
infer safe defaults
record editable assumptions
ask only when a missing field blocks quality, safety, source grounding, template routing, or classroom usefulness
```

## Pipeline

```text
1. Intake Normalizer
2. Clarify Or Assume
3. Pack Planner
4. Source Grounding Planner
5. Source Acquisition Gate
6. Generation Inputs Builder
7. Visual Handoff Builder
8. Pre-Render QA
```

## Intake Normalizer

Prompt:

```text
You are the Intake Normalizer for a teacher resource pack generator.

Convert the teacher request into structured intent fields.

Rules:
- Do not generate lesson content yet.
- Preserve the teacher's exact request.
- Extract topic, year_level, subject, artifact requests, constraints, local context, and source refs if present.
- If a field is missing but can be safely defaulted later, set it to null.
- Flag sensitive_or_high_stakes for safety, health, trauma, legal, personal student data, or formal assessment consequences.

Return JSON only.
```

Schema:

```json
{
  "raw_teacher_request": "",
  "topic": null,
  "year_level": null,
  "subject": null,
  "learning_goal": null,
  "lesson_duration": null,
  "student_profile": null,
  "language_variant": null,
  "requested_artifacts": [],
  "source_refs_or_source_notes": [],
  "local_context": null,
  "constraints": [],
  "sensitive_or_high_stakes": false,
  "missing_fields": [],
  "clarification_needed": false,
  "clarification_question": null
}
```

## Clarify Or Assume

Safe defaults:

```text
pack_shape: core_teaching_pack
lesson_duration: 45 minutes
student_profile: mixed ability
language_variant: NZ English
requested_artifacts: slides + worksheet + answer key + teacher notes + source notes + manifest
review_required: true
```

Ask only when:

```text
missing topic
missing year level / age band
missing subject when ambiguous
sensitive/high-stakes topic
formal assessment consequences
teacher requests local curriculum/source alignment with no context
private/school-owned source permission is unclear
student-specific sensitive data is present
```

Output:

```json
{
  "assumptions": [
    {
      "field": "",
      "value": "",
      "reason": "",
      "editable": true
    }
  ],
  "blocking_questions": [],
  "can_continue_to_planning": true,
  "can_continue_to_content_generation": true
}
```

## Pack Planner

Routing:

```text
factual concept/topic/process:
  lesson_deck_concept_explain
  worksheet_scaffolded_practice
  answer_key_closed_and_short_response

repeatable strategy/writing/maths procedure:
  lesson_deck_strategy_model
  worksheet_scaffolded_practice
  answer_key_open_ended_rubric or answer_key_closed_and_short_response

revision/homework/recap:
  worksheet_retrieval_and_extension
  answer_key_closed_and_short_response

game/revision challenge:
  core content first
  escape_quiz_game question bank only after content is stable
  printable fallback required

visible science/topic parts:
  oc_science_diagram labelled_diagram or blank_labelling_worksheet candidate

literacy/writing/abstract/non-diagram:
  oc_literacy_editorial anchor_chart/checklist candidate
  or not_applicable
```

Current runtime alias notes:

```text
lesson_deck_concept_explain -> lesson_deck_science_concept
lesson_deck_strategy_model -> lesson_deck_writing_strategy
answer_key_open_ended_rubric -> current open-ended answer key renderer/metadata needs explicit mapping
```

Use canonical spec IDs in planning. Runtime generation may map to existing IDs only through a visible alias table.

## Source Grounding Planner

Policy:

```text
Factual science/social studies claims need trusted public, teacher-owned, or school-owned sources.
Curriculum alignment claims need source notes or teacher_review_required.
Writing/maths strategy explanations may use teacher-reviewed pedagogical convention.
Local examples need sensitivity/context review.
No source notes means source_grounding_status: missing and classroom_review_status: pending_teacher_review.
Do not mark factual_safety pass.
```

## Source Acquisition Gate

Runs after source planning and before factual content filling.

Do not ask the teacher by default for ordinary public factual topics. The agent should usually acquire or attach trusted public sources itself. Ask only when source choice is local, sensitive, private, curriculum-specific, or unavailable.

Outcomes:

```text
source_acquired:
  continue to content fillers

source_notes_needed:
  continue only if generated content visibly marks review/source gaps

source_missing_blocking:
  do not generate final factual slide/worksheet wording
```

Output:

```json
{
  "gate_status": "source_acquired | source_notes_needed | source_missing_blocking",
  "teacher_question_required": false,
  "teacher_question": null,
  "sources_to_attach": [],
  "source_grounding_status": {
    "status": "missing | source_notes_present | claim_level_grounded",
    "trusted_sources_count": 0,
    "claim_level_grounding": "not_run | partial | complete",
    "review_required": true,
    "notes": []
  },
  "can_continue_to_content_fillers": false
}
```

## Generation Inputs Builder

Do not write final classroom artifacts here. Produce inputs for later content generation.

Required groups:

```text
lesson_deck_generation_inputs
worksheet_generation_inputs
answer_key_generation_inputs
teacher_notes_generation_inputs
optional_game_question_bank_inputs
```

Each group should include:

```text
template_id
title/topic seed
learning_goal
roles/sections to fill
source requirements
review flags
```

## Visual Handoff Builder

OpenDesign receives structured content and asset slots only. It should not invent pedagogy or facts.

Output:

```json
[
  {
    "project_id": "teacher-style-<pack-id>-<timestamp>",
    "pack_id": "",
    "artifact_id": "",
    "style_family": "oc_science_diagram | oc_literacy_editorial | oc_classroom_clean | oc_game_projector",
    "component_template": "",
    "year_level": "",
    "subject": "",
    "print_target": "A4_portrait | A4_landscape | 16_9 | browser_responsive",
    "content": {},
    "asset_slots": [
      {
        "slot_id": "",
        "asset_type": "deterministic_svg | trusted_photo | generated_illustration | text_only | none",
        "status": "ready | styled | asset_pending | reference_only_not_reusable | not_applicable",
        "source_or_license_note": ""
      }
    ],
    "source_notes": [],
    "constraints": {
      "editable_html": true,
      "print_pdf": true,
      "low_ink_mode": false,
      "teacher_review_required": true,
      "proprietary_reference_used": false
    },
    "review_status": {
      "source_grounding_status": "",
      "classroom_review_status": "pending_teacher_review"
    }
  }
]
```

## Pre-Render QA

Check:

```text
one clear learning goal
safe assumptions recorded
no unnecessary teacher questions
template route correct
source gate present
classroom review separate
visual handoff safe
non-diagram topics do not force diagrams
no copied competitor content
ready_to_render status honest
```

Output:

```json
{
  "qa": {
    "status": "pass | partial | fail",
    "scope": "pre_generation_briefing_only",
    "checks": [],
    "blocking_issues": [],
    "notes": []
  },
  "classroom_review_status": {
    "status": "pending_teacher_review",
    "review_required": true
  }
}
```

## Fixture Expectations

Volcanoes:

```text
teacher questions: 0
route: concept lesson + scaffolded worksheet + closed/short answer key
source gate: required before final factual wording
visual: oc_science_diagram labelled/blank candidates
game: candidate after core content
```

Persuasive writing:

```text
teacher questions: 0
route: strategy lesson + scaffolded worksheet + open-ended rubric
source gate: optional unless curriculum alignment is claimed
labelled diagram: not_applicable
visual: oc_literacy_editorial anchor chart/checklist optional
game: not included unless requested
```
