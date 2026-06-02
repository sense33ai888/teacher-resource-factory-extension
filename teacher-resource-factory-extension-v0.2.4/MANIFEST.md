# Teacher Resource Factory Extension Manifest

Package: teacher-resource-factory-extension-v0.2.4-20260602
Created: 2026-06-02

## Included

```text
teacher-resource-factory-prototype
  README.md
  config/lane-registry.json
  config/topic-plans.json
  examples/
  lanes/lesson-slide/index.mjs
  lanes/worksheet/index.mjs
  lanes/educational-diagram/index.mjs
  schemas/
  scripts/teacher-resource-factory.mjs
  scripts/generate-add-sub-tsunami-test.mjs
  scripts/generate-chalkie-style-tsunami-activity-test.mjs
  scripts/generate-fraction-decimal-percent-worksheet-test.mjs

lesson-slide-template-system-prototype
  README.md
  assets/matariki/
  assets/solar-system/
  examples/
  renderers/html/render-photo-led-lesson-deck.mjs
  renderers/html/render-diagram-led-concept-deck.mjs
  schemas/
  templates/

owned skills
  teacher-resource-pack-briefing
  teacher-resource-pack-generator
  teacher-vault-artifact-publisher
```

## Excluded

```text
teacher-resource-factory-prototype/outputs/
teacher vault Resources/
teacher capture episodes
four-piece base zips
local browser state
cookies or credentials
```

## Version Notes

v0.2.1 fixes install compatibility for teacher workspaces where `TEACHER-VAULT.json` lives at the workspace root instead of inside `teacher-sandbox/`.

The factory now resolves the vault pointer in this order:

```text
TEACHER_VAULT_CONFIG env var
teacher-sandbox/TEACHER-VAULT.json
workspace-root/TEACHER-VAULT.json
```

The publisher creates `<teacher-vault>/Resources/<Type>/` folders as needed.

Usage count/log behavior is intentionally not implemented inside the Factory Extension skills. If usage counting is needed, Yuna's active agent instruction surface must load `YUNA-PERSISTENT-RULE.md`, and the agent must append usage records according to that persistent rule.

v0.2.2 fixes the install gap found by Yuna's first smoke test:

```text
missing dependency: teacher-sandbox/lesson-slide-template-system-prototype/
```

It now includes the lesson slide template system required by the Solar System photo-led lesson deck and the diagram-led deck benchmarks. The slide renderers also resolve Playwright and Chromium from the current user's home directory or environment variables instead of relying on `/Users/apple`.

v0.2.3 fixes the real-use routing issue found by Yuna:

```text
fractions request -> no longer becomes Untitled Topic / Solar System
tsunami request -> no longer becomes Untitled Topic / Solar System
unsupported topic -> refuses to fall back to unrelated content
```

Functional changes:

```text
topic-plans.json adds Fractions and Tsunamis
teacher-resource-factory.mjs uses dynamic local date stamps
natural-language resource words constrain lanes
QA checks topic alignment before publishing
publish is skipped if automated QA fails
tsunami diagram lane emits a deterministic tsunami SVG
```

v0.2.4 fixes the memory-chain check Factory gap:

```text
exit ticket request -> now maps to exit_ticket lane
exit ticket lane emits short printable HTML/PDF student artifact
publisher classifies exit-ticket artifacts into Resources/Worksheets/
published filenames use exit-ticket as the file type
qa.expectedArtifactMinimum counts exit_ticket artifacts before publish
```

## Verification On Source Machine

```text
script syntax checks: pass
Fractions worksheet/homework real-use test: pass
Tsunami diagram/worksheet real-use test: pass
Solar System slide lesson real-use test: pass
Unsupported topic fallback refusal test: pass
Fractions exit-ticket + teacher-notes memory-chain test: pass
teacher vault publish: pass
qa.pass: true
```

## Promotion Status

```text
teacher-sandbox: yes
canonical promotion: no
production teacher install candidate: yes, as experimental extension
```
