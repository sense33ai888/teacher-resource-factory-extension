# QA And Failure Policy

## QA Layers

### Artifact Quality

Check:

```text
slides structure complete
worksheet printable
answer key aligned
teacher notes useful
manifest complete
resource_pack.json complete
rendered slides HTML/PDF available when runtime exists
rendered worksheet HTML/PDF available when runtime exists
visual pair has a labelled and blank version when Phase B is requested
escape quiz game loads and can complete at least one answer path when Phase C is requested
printable game fallback exists when Phase C is requested
```

### Teacher Usability

Check:

```text
teacher can use within 5 minutes of review
classroom flow is clear
files are easy to find
assumptions are visible
review notes are transparent
```

### Pedagogical Quality

Check:

```text
year-level fit
cognitive load
student action present
quick check present
answer key correctness
language is student-friendly
```

### Production Quality

Check:

```text
generation stayed within budget
artifact statuses recorded
partial failure handled
template IDs recorded
source/review metadata recorded
qa.status does not mix automated QA with teacher classroom review
source_grounding_status exists for factual packs
classroom_review_status exists for teacher approval
```

## Failure Policy

Never fail the whole pack if one artifact fails.

Rules:

```text
If slides succeed and worksheet fails:
-> deliver slides + teacher notes + manifest with worksheet status failed.

If worksheet succeeds but answer key fails:
-> deliver worksheet, mark teacher_review_required, and retry answer key.

If visual generation is requested but fails:
-> preserve core pack and mark visual retry_available.

If game generation is requested but fails:
-> generate printable quiz instead.

If PPTX export fails:
-> deliver HTML/source deck and mark PPTX retry_available.

If HTML/PDF rendering fails:
-> preserve Markdown source files and mark rendered exports retry_available.

If source grounding is missing for factual content:
-> do not mark factual safety as pass; set source_grounding_status missing and classroom_review_status pending_teacher_review.

If teacher classroom review is pending:
-> automated qa.status may still pass, but classroom_review_status remains pending_teacher_review.
```

Artifact statuses:

```text
ready
partial
failed
retry_available
teacher_review_required
```

## Cost And Latency Budget

MVP-A budget:

```json
{
  "max_generation_minutes": 4,
  "max_image_generations": 0,
  "max_visual_artifacts": 0,
  "max_total_artifacts": 6,
  "max_rendered_exports": 4,
  "fallback_if_over_budget": "deliver core pack first and mark enhancements queued"
}
```

Phase B budget:

```json
{
  "max_image_generations": 2,
  "max_visual_artifacts": 2,
  "default_rendered_visual_exports": 4
}
```

Phase C budget:

```json
{
  "max_games": 1,
  "default_game_type": "escape_quiz_game",
  "default_printable_fallback": true,
  "fallback_if_game_fails": "deliver printable quiz and mark game retry_available"
}
```

## Pass Condition For First Benchmark

Prompt:

```text
Make a Year 4 Forces of Nature resource pack about volcanoes.
```

Required outputs:

```text
lesson slides source or outline
worksheet
answer key
teacher notes
pack-manifest.md
resource_pack.json
```

Pass if:

```text
teacher can use the core pack with under 5 minutes of review
worksheet and answer key align
assumptions are visible
template IDs are recorded
QA status is pass or partial with clear notes
source grounding and classroom review statuses are separate
```
