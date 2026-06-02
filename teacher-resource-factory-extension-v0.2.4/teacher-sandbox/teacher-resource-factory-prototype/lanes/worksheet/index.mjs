import fs from "node:fs/promises";
import path from "node:path";

export async function executeWorksheetLane({ intake, plan, packDir, artifacts, context }) {
  const html = worksheetHtml(intake, plan, "worksheet", context);
  const htmlPath = path.join(packDir, "worksheets", `${context.slug(intake.topic)}-worksheet.html`);
  const pdfPath = path.join(packDir, "worksheets", `${context.slug(intake.topic)}-worksheet.pdf`);

  await fs.writeFile(htmlPath, html, "utf8");
  await context.htmlToPdf(htmlPath, pdfPath, "8.27in", "11.69in");
  context.addArtifact(artifacts, "worksheet_html", "worksheet", htmlPath, packDir);
  context.addArtifact(artifacts, "worksheet_pdf", "worksheet", pdfPath, packDir);
}

export async function executeHomeworkLane({ intake, plan, packDir, artifacts, context }) {
  const html = worksheetHtml(intake, plan, "homework", context);
  const htmlPath = path.join(packDir, "homework", `${context.slug(intake.topic)}-homework.html`);
  const pdfPath = path.join(packDir, "homework", `${context.slug(intake.topic)}-homework.pdf`);

  await fs.writeFile(htmlPath, html, "utf8");
  await context.htmlToPdf(htmlPath, pdfPath, "8.27in", "11.69in");
  context.addArtifact(artifacts, "homework_html", "homework", htmlPath, packDir);
  context.addArtifact(artifacts, "homework_pdf", "homework", pdfPath, packDir);
}

export async function executeExitTicketLane({ intake, plan, packDir, artifacts, context }) {
  const html = exitTicketHtml(intake, plan, context);
  const htmlPath = path.join(packDir, "exit-tickets", `${context.slug(intake.topic)}-exit-ticket.html`);
  const pdfPath = path.join(packDir, "exit-tickets", `${context.slug(intake.topic)}-exit-ticket.pdf`);

  await fs.writeFile(htmlPath, html, "utf8");
  await context.htmlToPdf(htmlPath, pdfPath, "8.27in", "5.85in");
  context.addArtifact(artifacts, "exit_ticket_html", "exit-ticket", htmlPath, packDir);
  context.addArtifact(artifacts, "exit_ticket_pdf", "exit-ticket", pdfPath, packDir);
}

function worksheetHtml(intake, plan, kind, context) {
  const { documentHtml, escapeHtml } = context;
  const title = kind === "homework" ? `${intake.topic} Homework` : `${intake.topic} Worksheet`;
  const intro = kind === "homework"
    ? "Complete these questions independently. Use full sentences where helpful."
    : "Use the slides and diagram to answer the questions.";
  const questions = plan.worksheet_questions
    .map(([q], index) => `<div class="q"><strong>${index + 1}. ${escapeHtml(q)}</strong><div class="line"></div><div class="line short"></div></div>`)
    .join("");

  return documentHtml(title, `<h1>${escapeHtml(title)}</h1>
<div class="meta"><span>Name:</span><span>Date:</span></div>
<p class="intro">${escapeHtml(intro)}</p>
<section class="vocab"><h2>Key Vocabulary</h2><p>${plan.vocab.map(escapeHtml).join(" · ")}</p></section>
<section>${questions}</section>
<section class="reflect"><h2>Reflection</h2><p>One thing I understand now is:</p><div class="line"></div><div class="line"></div></section>`, "worksheet");
}

function exitTicketHtml(intake, plan, context) {
  const { documentHtml, escapeHtml } = context;
  const title = `${intake.topic} Exit Ticket`;
  const sourceQuestions = Array.isArray(plan.worksheet_questions) ? plan.worksheet_questions : [];
  const questions = sourceQuestions.slice(0, 3);
  while (questions.length < 3) {
    questions.push([`Write one thing you understand about ${intake.topic}.`, "Answers vary."]);
  }
  const questionHtml = questions
    .map(([q], index) => `<div class="q"><strong>${index + 1}. ${escapeHtml(q)}</strong><div class="line"></div></div>`)
    .join("");

  return documentHtml(title, `<h1>${escapeHtml(title)}</h1>
<div class="meta"><span>Name:</span><span>Date:</span></div>
<p class="intro">Complete this quick check independently before you leave.</p>
<section>${questionHtml}</section>
<section class="reflect"><h2>Confidence Check</h2><p>Circle one: I need more practice / I am nearly there / I can explain this to someone else.</p><div class="line short"></div></section>`, "worksheet");
}
