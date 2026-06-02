# Teacher Resource Factory Extension Install

Version: v0.2.4
Date: 2026-06-02
Status: experimental teacher-sandbox extension

## Purpose

This package is the fifth install layer on top of the existing four-piece teacher agent base.

The four-piece base gives the teacher agent a vault, runtime foundation, router, and capture-pure recording. This extension adds the resource production system:

```text
Teacher request
-> intake / briefing
-> router
-> lane execution
-> worksheet / slide / diagram generation
-> answer key / teacher notes / source notes
-> teacher vault publishing
```

## Install Order

Install or verify the existing four pieces first:

```text
1. teacher-empty-fork-vault-template
2. openclaw-agent-foundation
3. teacher-router
4. capture-pure-hook
```

Then install this package:

```text
5. teacher-resource-factory-extension
```

If the teacher agent already has a working vault pointer, router, and capture hook, do not reinstall the base blindly. Upgrade only missing or stale base pieces.

## Package Contents

```text
teacher-sandbox/teacher-resource-factory-prototype/
teacher-sandbox/lesson-slide-template-system-prototype/
owned-skills/skills/teacher-resource-pack-briefing/
owned-skills/skills/teacher-resource-pack-generator/
owned-skills/skills/teacher-vault-artifact-publisher/
```

Generated outputs and teacher vault products are intentionally not included.

## Target Layout

Assume the teacher workspace root is:

```text
$HOME/.openclaw/workspace
```

After install, the target should contain:

```text
$HOME/.openclaw/workspace/teacher-sandbox/teacher-resource-factory-prototype/
$HOME/.openclaw/workspace/teacher-sandbox/lesson-slide-template-system-prototype/
$HOME/.openclaw/workspace/owned-skills/skills/teacher-resource-pack-briefing/
$HOME/.openclaw/workspace/owned-skills/skills/teacher-resource-pack-generator/
$HOME/.openclaw/workspace/owned-skills/skills/teacher-vault-artifact-publisher/
```

The vault pointer may exist in either location:

```text
$HOME/.openclaw/workspace/teacher-sandbox/TEACHER-VAULT.json
$HOME/.openclaw/workspace/TEACHER-VAULT.json
```

The factory checks `teacher-sandbox/TEACHER-VAULT.json` first, then falls back to the workspace root pointer. You do not need to duplicate the pointer if the root pointer is already valid.

## Manual Install

From the unpacked extension folder:

```text
EXT_ROOT="<unpacked>/teacher-resource-factory-extension-v0.2.4"
WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"

mkdir -p "$WORKSPACE_ROOT/teacher-sandbox"
mkdir -p "$WORKSPACE_ROOT/owned-skills/skills"

cp -R "$EXT_ROOT/teacher-sandbox/teacher-resource-factory-prototype" "$WORKSPACE_ROOT/teacher-sandbox/"
cp -R "$EXT_ROOT/teacher-sandbox/lesson-slide-template-system-prototype" "$WORKSPACE_ROOT/teacher-sandbox/"
cp -R "$EXT_ROOT/owned-skills/skills/teacher-resource-pack-briefing" "$WORKSPACE_ROOT/owned-skills/skills/"
cp -R "$EXT_ROOT/owned-skills/skills/teacher-resource-pack-generator" "$WORKSPACE_ROOT/owned-skills/skills/"
cp -R "$EXT_ROOT/owned-skills/skills/teacher-vault-artifact-publisher" "$WORKSPACE_ROOT/owned-skills/skills/"
```

If updating an existing install, back up the old three skill folders, old factory folder, and old lesson slide template system folder first.

## v0.2.2 Patch Note

v0.2.2 is a direct fix for the v0.2.1 smoke-test failure where Solar System slide rendering could not find:

```text
teacher-sandbox/lesson-slide-template-system-prototype/renderers/html/render-photo-led-lesson-deck.mjs
```

The package now includes `teacher-sandbox/lesson-slide-template-system-prototype/`.

## v0.2.3 Functional Fix

v0.2.3 fixes the real-use test failure where natural teacher requests for `fractions` and `tsunami` were misdetected as `Untitled Topic` and silently inherited Solar System content while still returning `qa.pass: true`.

The factory now:

```text
recognises Fractions and Tsunamis
uses prompt resource words to constrain lanes
checks topic alignment before publish
refuses unsupported topics instead of falling back to unrelated content
uses dynamic local date stamps
```

After installing v0.2.3, re-run:

```text
Make a Year 5 fractions worksheet and homework pack.
Make a Year 6 tsunami diagram and worksheet pack.
Make a Year 4 solar system slide lesson pack.
```

## v0.2.4 Memory-Chain Factory Fix

v0.2.4 fixes the Factory gap found during the memory acquisition chain check:

```text
Make a Year 5 fractions exit ticket and teacher note.
```

The factory now:

```text
maps exit ticket / exit slip / quick check to the exit_ticket lane
emits a short printable exit-ticket HTML/PDF artifact
counts exit_ticket in automated QA minimums
publishes exit-ticket products under <teacher-vault>/Resources/Worksheets/
uses file type exit-ticket in the clean published filename
```

After installing v0.2.4, re-run:

```text
Make a Year 5 fractions exit ticket and teacher note.
```

Expected:

```text
topic: Fractions
lanes include: exit_ticket, teacher_notes, answer_key, source_notes
qa.pass: true
published exit-ticket HTML/PDF in Resources/Worksheets/
.ai-original same-name copies exist
```

## Teacher Vault Resources

The publisher creates Resources subfolders as needed:

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

AI originals are created under same-name hidden subfolders:

```text
<teacher-vault>/Resources/<Type>/.ai-original/
```

It is safe if `<teacher-vault>/Resources/` does not exist before install; the first publish will create the needed type folder.

## Smoke Test

Run:

```text
WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
node "$WORKSPACE_ROOT/teacher-sandbox/teacher-resource-factory-prototype/scripts/teacher-resource-factory.mjs" \
  --request "Make a Year 5 Solar System lesson pack"
```

Expected:

```text
status: factory_pack_created
published: true
qa.pass: true
```

Teacher-facing products should appear in:

```text
<teacher-vault>/Resources/
```

## Current Supported Lanes

```text
lesson_slide
worksheet
homework
exit_ticket
educational_diagram
labelling_worksheet
answer_key
teacher_notes
source_notes
teacher_preview
```

## Current Benchmarks

```text
Matariki
Solar System
Volcanoes
Earth Layers
Fraction / Decimal / Percentage worksheet fixture
Tsunami activity fixture
Addition / Subtraction worksheet + homework fixture
```

## Boundaries

- This extension does not replace the four-piece base.
- This extension does not modify capture-pure behavior.
- This extension does not calculate teacher edit diffs.
- This extension does not include generated teacher products.
- This extension remains teacher-sandbox experimental until the router and template library are further generalized.
- This extension does not internally auto-increment usage counts or write Yuna's first-round skill usage log.

## Usage Log Boundary

If Yuna needs first-round skill usage counts, the counting must come from Yuna's active persistent rule, not from the Factory Extension skills themselves.

Yuna's agent must load:

```text
YUNA-PERSISTENT-RULE.md
```

into its active instruction surface. After that, Yuna's agent appends usage records according to the rule, normally to:

```text
<teacher-vault>/skills/yuna-first-round-overlay-20260602/usage/yuna-first-round-skill-usage.jsonl
```

The Factory Extension produces resources and publishes artifacts. It does not by itself write this usage log or update usage counts.
