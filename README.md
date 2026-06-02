# Teacher Resource Factory Extension

This repository stores the standalone Teacher Resource Factory / lesson slide system extension.

It is separate from the full Teacher Agent sandbox installer.

In plain English:

```text
This repo is the resource-making system.
It is where slide templates, worksheet lanes, diagram lanes, topic plans, and renderers live.
```

It is not the whole teacher agent install package.

The whole install package lives in:

```text
sense33ai888/teacher-agent
```

## What This System Does

The Teacher Resource Factory turns a teacher request into classroom resources.

Example teacher requests:

```text
Make a Year 4 solar system slide lesson pack.
Make a Year 6 tsunami diagram and worksheet pack.
Make a Year 5 fractions worksheet and homework pack.
```

The factory chooses the right resource lanes:

```text
lesson_slide
worksheet
homework
educational_diagram
answer_key
teacher_notes
source_notes
```

Then it renders teacher-facing files that can be published into the teacher vault.

## Three-Layer Template Idea

This repo follows the three-layer template architecture:

```text
1. Intake template
   What does the teacher want?

2. Output structure template
   What resource structure should be produced?

3. Visual rendering template
   What should it look like?
```

The slide system is mostly layer 2 + layer 3.

The factory router/lane system connects teacher requests to the correct templates.

## Current Version

```text
teacher-resource-factory-extension-v0.2.4-20260602
```

Packaged zip:

```text
teacher-resource-factory-extension-v0.2.4-20260602.zip
```

SHA256:

```text
761726ea89916e5f4ece1b20053c6c238bf6db781adfa43da9affbf9a618ae65
```

## Source Directory

Browse the extracted source here:

```text
teacher-resource-factory-extension-v0.2.4/
```

Key parts:

## Main Areas

```text
teacher-sandbox/lesson-slide-template-system-prototype/
```

The slide template system. It includes:

```text
photo-led lesson deck renderer
diagram-led concept deck renderer
slide fixture examples
visual rendering templates
public/NASA-style image assets
```

Use this area when improving:

```text
slide visual style
photo-led deck templates
diagram-led deck templates
slide examples
image asset handling
```

```text
teacher-sandbox/teacher-resource-factory-prototype/
```

The factory router/lane prototype. It includes:

```text
topic plans
lane registry
worksheet lane
lesson slide lane
educational diagram lane
factory script
smoke-test generators
```

Use this area when improving:

```text
topic routing
lane selection
worksheet/homework/diagram execution
factory pack generation
natural-language request handling
```

```text
owned-skills/skills/
```

The related teacher-facing skills:

```text
teacher-resource-pack-briefing
teacher-resource-pack-generator
teacher-vault-artifact-publisher
```

Use this area when improving:

```text
teacher prompt briefing
resource pack generation skill behavior
publishing products into the teacher vault
```

## Current Template Families

Slide templates:

```text
photo_led_lesson_deck_v1
diagram_led_concept_deck_v1
```

Factory lanes:

```text
lesson_slide
worksheet
educational_diagram
answer_key
teacher_notes
source_notes
homework
```

Benchmark/example topics:

```text
Matariki
Solar System
Volcanoes
Earth Layers
Fractions
Tsunamis
```

## Where To Edit

For slide visual rendering:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/lesson-slide-template-system-prototype/renderers/html/
```

For slide fixture examples:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/lesson-slide-template-system-prototype/examples/
```

For slide output/visual template definitions:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/lesson-slide-template-system-prototype/templates/
```

For topic routing and lane hints:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/teacher-resource-factory-prototype/config/topic-plans.json
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/teacher-resource-factory-prototype/config/lane-registry.json
```

For worksheet/diagram/slide lane code:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/teacher-resource-factory-prototype/lanes/
```

For the main factory script:

```text
teacher-resource-factory-extension-v0.2.4/teacher-sandbox/teacher-resource-factory-prototype/scripts/teacher-resource-factory.mjs
```

## Important Boundary

Do not use this repo to install a full teacher agent machine.

Use this repo to work on:

```text
resource factory logic
slide templates
worksheet/diagram lanes
factory examples
renderer code
```

Use the full installer repo to install:

```text
foundation
capture-pure
memory_search
teacher sandbox config
teacher vault publisher
full smoke-test setup
```

## How To Think About Future Work

Preferred next changes:

```text
add template fixtures as data
improve existing renderers
add source/asset strategy fields
make router rules more generic
add one lane at a time
```

Avoid:

```text
copying competitor templates directly
hardcoding one topic into renderer logic
adding many templates before route/lane quality is stable
mixing full installer changes into this repo
```

## Relationship To Installer

The full install bundle lives in a separate repository:

```text
sense33ai888/teacher-agent
```

Use this repository when working on the resource factory / slide system itself.

Use the full installer repository when installing a teacher-agent sandbox on another machine.

## Verify Zip

```bash
shasum -a 256 -c CHECKSUMS-SHA256.txt
```

Expected:

```text
teacher-resource-factory-extension-v0.2.4-20260602.zip: OK
```
