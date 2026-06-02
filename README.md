# Teacher Resource Factory Extension

This repository stores the standalone Teacher Resource Factory / lesson slide system extension.

It is separate from the full Teacher Agent sandbox installer.

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

```text
owned-skills/skills/
```

The related teacher-facing skills:

```text
teacher-resource-pack-briefing
teacher-resource-pack-generator
teacher-vault-artifact-publisher
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

