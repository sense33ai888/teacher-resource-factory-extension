import fs from "node:fs/promises";
import path from "node:path";

export async function executeLessonSlideLane({ intake, plan, packDir, artifacts, context }) {
  const { addArtifact, primaryNode, run, slideTemplateRoot, slug } = context;
  const outDir = path.join(packDir, "slides", "rendered");
  await fs.mkdir(outDir, { recursive: true });

  const renderer = plan.lesson_slide_template_lane === "diagram_led_concept_deck_v1"
    ? "render-diagram-led-concept-deck.mjs"
    : "render-photo-led-lesson-deck.mjs";

  run(primaryNode, [
    path.join(slideTemplateRoot, "renderers", "html", renderer),
    plan.fixture_path,
    "--out",
    outDir
  ]);

  const fixture = JSON.parse(await fs.readFile(plan.fixture_path, "utf8"));
  const base = fixture.about;
  const htmlSource = path.join(outDir, `${base}-slides.html`);
  const pdfSource = path.join(outDir, `${base}-slides.pdf`);
  const notesSource = path.join(outDir, `${base}-source-notes.md`);
  const htmlTarget = path.join(packDir, "slides", `${slug(intake.topic)}-slides.html`);
  const pdfTarget = path.join(packDir, "slides", `${slug(intake.topic)}-slides.pdf`);
  const notesTarget = path.join(packDir, "source-notes", `${slug(intake.topic)}-slide-source-notes.md`);

  await fs.copyFile(htmlSource, htmlTarget);
  await fs.copyFile(pdfSource, pdfTarget);
  await fs.copyFile(notesSource, notesTarget);

  addArtifact(artifacts, "lesson_slides_html", "slides", htmlTarget, packDir);
  addArtifact(artifacts, "lesson_slides_pdf", "slides", pdfTarget, packDir);
}
