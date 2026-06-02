import fs from "node:fs/promises";
import path from "node:path";

export async function executeDiagramLane({ intake, plan, packDir, artifacts, context }) {
  const svg = await renderDiagramSvg(intake, plan, context);
  const svgPath = path.join(packDir, "diagrams", `${context.slug(intake.topic)}-diagram.svg`);
  const htmlPath = path.join(packDir, "diagrams", `${context.slug(intake.topic)}-diagram.html`);
  const pdfPath = path.join(packDir, "diagrams", `${context.slug(intake.topic)}-diagram.pdf`);

  await fs.writeFile(svgPath, svg, "utf8");
  await fs.writeFile(htmlPath, context.documentHtml(`${intake.topic} Diagram`, `<div class="diagram-wrap">${svg}</div>`, "diagram"), "utf8");
  await context.htmlToPdf(htmlPath, pdfPath, "11in", "8.5in");
  context.addArtifact(artifacts, "educational_diagram_svg", "educational_diagram", svgPath, packDir);
  context.addArtifact(artifacts, "educational_diagram_html", "educational_diagram", htmlPath, packDir);
  context.addArtifact(artifacts, "educational_diagram_pdf", "educational_diagram", pdfPath, packDir);

  if (plan.diagram_data_path) {
    const labellingHtml = await labellingWorksheetHtml(intake, plan, context);
    const labellingHtmlPath = path.join(packDir, "worksheets", `${context.slug(intake.topic)}-labelling-worksheet.html`);
    const labellingPdfPath = path.join(packDir, "worksheets", `${context.slug(intake.topic)}-labelling-worksheet.pdf`);
    await fs.writeFile(labellingHtmlPath, labellingHtml, "utf8");
    await context.htmlToPdf(labellingHtmlPath, labellingPdfPath, "8.27in", "11.69in");
    context.addArtifact(artifacts, "labelling_worksheet_html", "labelling-worksheet", labellingHtmlPath, packDir);
    context.addArtifact(artifacts, "labelling_worksheet_pdf", "labelling-worksheet", labellingPdfPath, packDir);
  }
}

async function renderDiagramSvg(intake, plan, context) {
  const { escapeHtml } = context;
  if (plan.diagram_data_path) {
    const data = JSON.parse(await fs.readFile(plan.diagram_data_path, "utf8"));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="${escapeHtml(data.view_box)}" role="img" aria-label="${escapeHtml(data.aria_label)}">
<style>.labels line{stroke:#176f6b;stroke-width:3}.labels rect{fill:#fffefb;stroke:#176f6b;stroke-width:2}.labels text{fill:#192027;font-family:Arial,sans-serif;font-size:24px;font-weight:760}</style>
${data.base_svg}
<g class="labels">
${data.labels.map((label) => `<line x1="${label.line.x1}" y1="${label.line.y1}" x2="${label.line.x2}" y2="${label.line.y2}" />
<rect x="${label.box.x}" y="${label.box.y}" width="${label.box.width}" height="${label.box.height}" rx="6" />
<text x="${label.text_position.x}" y="${label.text_position.y}">${escapeHtml(label.text)}</text>`).join("\n")}
</g>
</svg>`;
  }

  if (/matariki/i.test(intake.topic)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="0 0 1100 720" role="img" aria-label="Matariki relationship map">
<rect width="1100" height="720" fill="#081827"/>
<text x="70" y="92" fill="#f8fafc" font-family="Arial" font-size="46" font-weight="800">Matariki relationship map</text>
<circle cx="550" cy="360" r="82" fill="#f2b84b"/>
<text x="550" y="352" text-anchor="middle" fill="#06111f" font-family="Arial" font-size="28" font-weight="800">Matariki</text>
<text x="550" y="386" text-anchor="middle" fill="#06111f" font-family="Arial" font-size="18" font-weight="700">wellbeing</text>
${[
  [550, 140, "memory"], [790, 220, "ocean"], [820, 500, "rain"], [550, 610, "hopes"], [280, 500, "fresh water"], [280, 220, "food"]
].map(([x, y, label]) => `<line x1="550" y1="360" x2="${x}" y2="${y}" stroke="#63c7c9" stroke-width="4"/><circle cx="${x}" cy="${y}" r="54" fill="#63c7c9"/><text x="${x}" y="${y + 7}" text-anchor="middle" fill="#06111f" font-family="Arial" font-size="20" font-weight="800">${label}</text>`).join("")}
</svg>`;
  }

  if (/tsunami/i.test(intake.topic)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="0 0 1100 720" role="img" aria-label="Diagram showing how a tsunami can form after seafloor movement">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff3fb"/><stop offset="1" stop-color="#f8fbff"/></linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#65c7ea"/><stop offset="1" stop-color="#1d75a6"/></linearGradient>
  <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4bf7a"/><stop offset="1" stop-color="#a66a33"/></linearGradient>
</defs>
<rect width="1100" height="720" fill="url(#sky)"/>
<text x="60" y="78" fill="#123a5a" font-family="Arial" font-size="48" font-weight="800">How a Tsunami Forms</text>
<path d="M0 250 C110 220 200 270 310 244 C430 214 560 270 690 236 C810 208 910 250 1100 226 L1100 530 L0 530 Z" fill="url(#water)"/>
<path d="M760 530 C842 478 878 408 948 350 C997 310 1045 300 1100 292 L1100 720 L0 720 L0 530 Z" fill="url(#land)"/>
<path d="M60 530 L420 530 L482 470 L548 530 L760 530" fill="#8f6a4f" stroke="#644832" stroke-width="4"/>
<path d="M420 530 L482 470 L548 530" fill="#b7794a" stroke="#644832" stroke-width="3"/>
<path d="M482 470 L520 530" stroke="#202326" stroke-width="6"/>
<circle cx="500" cy="520" r="38" fill="none" stroke="#d44f2f" stroke-width="5"/>
<circle cx="500" cy="520" r="70" fill="none" stroke="#d44f2f" stroke-width="3" opacity=".7"/>
<circle cx="500" cy="520" r="102" fill="none" stroke="#d44f2f" stroke-width="2" opacity=".45"/>
<path d="M482 470 C482 430 482 392 482 352" stroke="#f8fafc" stroke-width="5" marker-end="url(#arrow)"/>
<path d="M548 530 C548 488 548 448 548 408" stroke="#f8fafc" stroke-width="5" marker-end="url(#arrow)"/>
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#f8fafc"/></marker></defs>
<path d="M590 290 C650 268 714 268 776 290" fill="none" stroke="#f8fafc" stroke-width="7"/>
<path d="M662 300 C730 328 796 344 858 334" fill="none" stroke="#f8fafc" stroke-width="6"/>
<path d="M866 325 C904 292 950 270 1004 268 C978 292 972 326 986 356 C948 342 908 340 866 325 Z" fill="#f8fafc" opacity=".9"/>
<g font-family="Arial" font-size="18" fill="#102033">
  <rect x="70" y="124" width="210" height="86" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="92" y="154" font-weight="800">1. Seafloor shifts</text><text x="92" y="181">An undersea earthquake</text><text x="92" y="202">can move the seafloor.</text>
  <rect x="318" y="118" width="214" height="96" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="340" y="148" font-weight="800">2. Water moves</text><text x="340" y="175">The water column is</text><text x="340" y="196">pushed up or down.</text>
  <rect x="570" y="118" width="220" height="96" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="592" y="148" font-weight="800">3. Waves spread</text><text x="592" y="175">Energy travels outward</text><text x="592" y="196">across the ocean.</text>
  <rect x="822" y="118" width="224" height="108" rx="10" fill="#fffefb" stroke="#d7dfdc"/><text x="844" y="148" font-weight="800">4. Near shore</text><text x="844" y="175">Waves slow in shallow</text><text x="844" y="196">water and can grow.</text>
</g>
<g font-family="Arial" font-size="18" fill="#123a5a" font-weight="800">
  <text x="445" y="586">earthquake source</text>
  <text x="646" y="260">waves travel outward</text>
  <text x="904" y="390">coastline</text>
  <text x="66" y="632" fill="#476173" font-size="18" font-weight="600">Simplified classroom model. Tsunamis are a series of waves.</text>
  <text x="66" y="658" fill="#476173" font-size="18" font-weight="600">Common triggers include undersea earthquakes, landslides, or volcanic activity.</text>
</g>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="0 0 1100 720" role="img" aria-label="Solar System orbit model">
<rect width="1100" height="720" fill="#06111f"/>
<text x="70" y="92" fill="#f8fafc" font-family="Arial" font-size="46" font-weight="800">Solar System model</text>
<circle cx="200" cy="380" r="70" fill="#f2b84b"/>
<text x="200" y="474" text-anchor="middle" fill="#f8fafc" font-family="Arial" font-size="22" font-weight="800">Sun</text>
${[
  [330, 12, "Mercury", "#aaa"], [410, 18, "Venus", "#d8a05f"], [500, 20, "Earth", "#4da3ff"], [590, 17, "Mars", "#cf6c64"],
  [710, 43, "Jupiter", "#d7b08b"], [835, 38, "Saturn", "#d6bf88"], [945, 28, "Uranus", "#63c7c9"], [1030, 28, "Neptune", "#4e75d9"]
].map(([x, r, name, color]) => `<line x1="200" y1="380" x2="${x}" y2="380" stroke="#233b56" stroke-width="2"/><circle cx="${x}" cy="380" r="${r}" fill="${color}"/><text x="${x}" y="455" text-anchor="middle" fill="#f8fafc" font-family="Arial" font-size="18" font-weight="700">${name}</text>`).join("")}
<text x="70" y="650" fill="#b9c6d6" font-family="Arial" font-size="22">Model note: planet sizes and distances are simplified for classroom visibility.</text>
</svg>`;
}

async function labellingWorksheetHtml(intake, plan, context) {
  const { documentHtml, escapeHtml } = context;
  const data = JSON.parse(await fs.readFile(plan.diagram_data_path, "utf8"));
  const blankSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeHtml(data.view_box)}" role="img" aria-label="${escapeHtml(data.aria_label)} labelling worksheet">
<style>.callouts circle{fill:#fffefb;stroke:#176f6b;stroke-width:4}.callouts text{fill:#176f6b;font-family:Arial,sans-serif;font-size:22px;font-weight:850}</style>
${data.base_svg}
<g class="callouts">
${data.labels.map((label, index) => `<circle cx="${label.callout.cx}" cy="${label.callout.cy}" r="20"/><text x="${label.callout.cx - 6}" y="${label.callout.cy + 8}">${index + 1}</text>`).join("\n")}
</g>
</svg>`;
  const answerLines = data.labels.map((_label, index) => `<div class="label-line"><strong>${index + 1}.</strong><span></span></div>`).join("");
  return documentHtml(`${intake.topic} Labelling Worksheet`, `<h1>${escapeHtml(plan.diagram_title || `${intake.topic} Diagram`)}</h1>
<div class="meta"><span>Name:</span><span>Date:</span></div>
<p class="intro">Label the diagram using the key vocabulary from the lesson.</p>
<div class="labelling-grid">
  <div class="blank-diagram">${blankSvg}</div>
  <section class="answer-lines"><h2>Labels</h2>${answerLines}</section>
</div>
<section class="vocab"><h2>Word Bank</h2><p>${plan.vocab.map(escapeHtml).join(" · ")}</p></section>`, "labelling");
}
