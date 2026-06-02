# Lesson Slide Template System Prototype

Status: experimental prototype

This folder proves one narrow claim:

```text
one reusable photo-led lesson template
-> two different topics
-> editable HTML + PDF + source notes + preview
```

Prototype lane:

```text
photo_led_lesson_deck_v1
```

Fixtures:

- `examples/matariki-year7-photo-led-foundation-deck.json`
- `examples/solar-system-year5-photo-led-deck.json`

Renderer:

- `renderers/html/render-photo-led-lesson-deck.mjs`

Boundary:

- Do not copy Chalkie/TeacherGPT text, code, questions, CSS, or images.
- Use competitor exports only to infer neutral template fingerprints.
- Keep source notes and image credits visible.
- Publish final teacher artifacts through `teacher-vault-artifact-publisher`.

