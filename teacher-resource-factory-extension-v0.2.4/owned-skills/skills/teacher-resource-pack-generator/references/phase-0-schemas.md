# Phase 0 Schemas

## resource_pack.json

Minimum schema:

```json
{
  "pack_id": "string",
  "created_at": "ISO-8601 datetime",
  "teacher_id": "string",
  "topic": "string",
  "year_level": "string",
  "subject": "string",
  "learning_goal": "string",
  "pack_shape": "core_teaching_pack",
  "assumptions": [
    {
      "field": "duration",
      "value": "45 minutes",
      "reason": "default",
      "editable": true
    }
  ],
  "templates": {
    "lesson_deck": "lesson_deck_science_concept",
    "worksheet": "worksheet_scaffolded_practice",
    "visuals": [],
    "game": null
  },
  "sources": [
    {
      "source_type": "teacher_owned | school_owned | public_trusted | ai_generated | template_generated",
      "source_ref": "string or null",
      "usage": "facts | questions | examples | layout | visuals",
      "confidence": "high | medium | low",
      "review_required": true
    }
  ],
  "artifacts": [
    {
      "artifact_id": "slides",
      "type": "lesson_slides",
      "status": "ready | partial | failed | retry_available | teacher_review_required",
      "path": "string",
      "template_id": "lesson_deck_science_concept",
      "notes": []
    }
  ],
  "rendered_exports": [
    {
      "artifact_id": "lesson-slides-html",
      "type": "rendered_slides_html",
      "status": "ready | partial | failed | retry_available",
      "path": "renders/lesson-slides.html",
      "source_artifact_id": "lesson-slides",
      "notes": []
    }
  ],
  "qa": {
    "status": "pass | partial | fail",
    "scope": "automated_artifact_checks_only",
    "checks": [],
    "notes": []
  },
  "source_grounding_status": {
    "status": "not_required | missing | source_notes_present | claim_level_grounded",
    "trusted_sources_count": 0,
    "claim_level_grounding": "not_run | partial | complete",
    "review_required": true,
    "notes": []
  },
  "classroom_review_status": {
    "status": "pending_teacher_review | approved_for_classroom | revision_requested",
    "review_required": true,
    "reviewed_by": null,
    "reviewed_at": null,
    "notes": []
  },
  "review_required": true
}
```

## pack-manifest.md

Every pack needs a teacher-facing entry point:

```markdown
# {Year Level} {Topic} Resource Pack

## Includes
- Lesson slides
- Worksheet
- Answer key
- Teacher notes

## Assumptions
- Year level:
- Duration:
- Student profile:
- Language:

## Suggested Classroom Flow
1. Slides:
2. Guided practice:
3. Worksheet:
4. Review/exit reflection:

## Review Notes
- AI-generated practice questions need teacher review.
- Local curriculum alignment should be checked if required.

## Artifact Status
| Artifact | Status | Notes |
|---|---|---|
| Slides | ready | |
| Worksheet | ready | |
| Answer key | ready | |

## Files
- slides:
- worksheet:
- answer key:
- teacher notes:
- resource_pack.json:

## Teacher Preview
- preview index:

## Rendered Files
- editable slides HTML:
- slides PDF:
- printable worksheet HTML:
- worksheet PDF:
```

## QA Semantics

Use these meanings consistently:

```text
qa.status:
  automated artifact checks only
  may be pass even when classroom review is still pending

source_grounding_status:
  whether factual claims have trusted source support
  source_notes_present is weaker than claim_level_grounded

classroom_review_status:
  teacher approval state before real classroom use
```

## Template Metadata

Every template must include governance metadata:

```json
{
  "template_id": "lesson_deck_science_concept",
  "resource_type": "lesson_deck",
  "age_band": "Year 3-6",
  "subject": ["science", "topic"],
  "use_when": ["concept introduction", "factual explanation"],
  "avoid_when": ["formal assessment", "open inquiry"],
  "slot_schema_version": "v1",
  "quality_status": "draft | active | deprecated",
  "last_reviewed_at": "date",
  "accepted_count": 0,
  "failure_count": 0,
  "notes": []
}
```

## MVP Freeze

Do not expand template count during MVP-A without explicit review.

```text
lesson templates: 4
worksheet templates: 4
visual templates: 3 for Phase B
game templates: 1 for Phase C
```
