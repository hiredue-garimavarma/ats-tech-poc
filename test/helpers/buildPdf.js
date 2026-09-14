// Writes a minimal one-page PDF with text at exact coordinates, so the geometry checks can be tested against a real file rather than a hand-built item list.

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function escapeText(text) {
    return text.replace(/([\\()])/g, "\\$1");
}

function contentStream(placements) {
    return placements
        .map(({ x, y, size = 10, text }) => `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapeText(text)}) Tj ET`)
        .join("\n");
}

function buildPdf(placements) {
    const stream = contentStream(placements);

    const objects = [
        "<</Type/Catalog/Pages 2 0 R>>",
        "<</Type/Pages/Kids[3 0 R]/Count 1>>",
        `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>`,
        `<</Length ${Buffer.byteLength(stream, "latin1")}>>\nstream\n${stream}\nendstream`,
        "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>"
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [];

    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf, "latin1"));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, "latin1");

    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, "latin1");
}

// Lays lines down a single column, the shape almost every ATS-safe resume uses.
function singleColumnPdf(lines, { x = 60, top = 720, leading = 14 } = {}) {
    return buildPdf(lines.map((text, index) => ({ x, y: top - (index * leading), text })));
}

// Lays two independent columns side by side and writes them column by column, which is the order a word processor stores them in and the reason ATS parsers scramble them.
function twoColumnPdf(leftLines, rightLines, { leftX = 60, rightX = 350, top = 720, leading = 14 } = {}) {
    return buildPdf([
        ...leftLines.map((text, index) => ({ x: leftX, y: top - (index * leading), text })),
        ...rightLines.map((text, index) => ({ x: rightX, y: top - (index * leading), text }))
    ]);
}

module.exports = { buildPdf, singleColumnPdf, twoColumnPdf, PAGE_WIDTH, PAGE_HEIGHT };
