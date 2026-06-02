# Teacher Resource Factory Prototype

Status: experimental v0.2 consolidation

This prototype turns the system map into a runnable factory:

```text
Teacher request
-> unified intake
-> clarify / assume
-> resource router
-> pack planner
-> source + asset planner
-> lane execution
-> alignment / QA
-> renderer / exporter
-> teacher vault publisher
-> teacher preview
```

Current runnable scope:

```text
lesson_slide
worksheet
educational_diagram
labelling_worksheet
homework
exit_ticket
answer_key
teacher_notes
source_notes
resource_pack manifest
teacher preview
```

Core v0.2 lanes are now split into lane modules:

```text
lanes/lesson-slide/
lanes/educational-diagram/
lanes/worksheet/
```

The lesson slide lane supports:

```text
photo_led_lesson_deck_v1
diagram_led_concept_deck_v1
```

The interim router registry lives in:

```text
config/topic-plans.json
```

Supported benchmark topics:

```text
Matariki
Solar System
Volcanoes
Earth Layers
Fractions
Tsunamis
```

Command:

```text
node scripts/teacher-resource-factory.mjs --request "Make a Year 5 Solar System lesson pack"
node scripts/teacher-resource-factory.mjs --request "Make a Year 5 fractions exit ticket and teacher note."
```

Regression commands:

```text
node scripts/teacher-resource-factory.mjs --request "Make a Year 5 Solar System lesson pack"
node scripts/teacher-resource-factory.mjs --request "Make a Year 4 volcanoes lesson pack"
node scripts/teacher-resource-factory.mjs --request "Make a Year 5 Earth's Layers lesson pack"
```

Boundary:

- This is not a canonical promoted skill yet.
- `topic-plans.json` is an interim router registry, not a promotion-ready router.
- Do not copy Chalkie/TeacherGPT content or designs.
- Keep source notes and review states visible.
- Publish teacher-facing artifacts through `teacher-vault-artifact-publisher`.
