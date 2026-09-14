const test = require("node:test");
const assert = require("node:assert/strict");

const { singleColumnPdf, twoColumnPdf, buildPdf } = require("./helpers/buildPdf");
const { scorePdf, scoreText } = require("./helpers/score");

const RESUME_LINES = [
    "Jane Smith  jane@corp.com  (415) 555-0199",
    "EXPERIENCE",
    "Senior Engineer, Acme (2021 - Present)",
    "- Cut checkout latency from 800ms to 210ms across 40k merchants",
    "- Led a team of nine engineers through a full platform rewrite",
    "Engineer, Square (2016 - 2021)",
    "- Built a ledger service handling 12B transactions every year",
    "EDUCATION",
    "MS Computer Science, Stanford University, 2016",
    "SKILLS",
    "Go, Rust, Kubernetes, Postgres, Kafka"
];

const SIDEBAR_LINES = ["CONTACT", "jane@corp.com", "(415) 555-0199", "SKILLS", "Go", "Rust", "Kubernetes", "Postgres", "Kafka", "Terraform", "gRPC", "Redis", "Kotlin", "Swift", "AWS"];

// A narrow sidebar beside a wide main column, which is how every "modern" resume template is built.
const sidebarLayout = () => twoColumnPdf(SIDEBAR_LINES, RESUME_LINES, { leftX: 50, rightX: 230 });

function findingFor(resume, id) {
    return resume.parseRisk.findings.find(finding => finding.id === id);
}

test("a single-column PDF passes every geometry check", async () => {
    const { resume } = await scorePdf(singleColumnPdf(RESUME_LINES));

    assert.equal(findingFor(resume, "singleColumn").status, "pass");
    assert.equal(findingFor(resume, "readingOrder").status, "pass");
    assert.equal(resume.parseRisk.health, 100);
});

// The layout that breaks real ATS parsers, and the reason this tool inspects geometry at all.
test("a two-column PDF is caught even though its text extracts cleanly", async () => {
    const { resume, score } = await scorePdf(sidebarLayout());

    assert.equal(findingFor(resume, "singleColumn").status, "fail");
    assert.match(findingFor(resume, "singleColumn").detail, /gutter/);
    assert.ok(resume.parseRisk.health < 80, `parse health was ${resume.parseRisk.health}`);
    // The interleaved text also destroys section detection, which is exactly what an ATS does with this layout.
    assert.ok(score.headline < 50, `headline was ${score.headline}`);
});

test("a two-column PDF scores below the same content in one column", async () => {
    const single = await scorePdf(singleColumnPdf(RESUME_LINES));
    const double = await scorePdf(sidebarLayout());

    assert.ok(double.score.headline < single.score.headline, `two-column ${double.score.headline} should be below single-column ${single.score.headline}`);
});

// A wide gap between a job title and a right-aligned date looks like a gutter until you check how far down the page it runs.
test("a right-aligned date rail is not mistaken for a column", async () => {
    const placements = RESUME_LINES.map((text, index) => ({ x: 60, y: 720 - (index * 14), text }));
    placements.push({ x: 470, y: 720 - (2 * 14), text: "2021 - Present" });
    placements.push({ x: 470, y: 720 - (5 * 14), text: "2016 - 2021" });

    const { resume } = await scorePdf(buildPdf(placements));

    assert.equal(findingFor(resume, "singleColumn").status, "pass");
});

test("a PDF with no text layer fails outright instead of scoring on an empty resume", async () => {
    const { resume, score } = await scorePdf(buildPdf([{ x: 60, y: 700, text: "CV" }]));

    assert.equal(findingFor(resume, "textLayer").status, "warn");
    assert.ok(score.headline < 50, `headline was ${score.headline}`);
});

// Losing the space glyph is a font problem, not a writing problem, and the report has to say which.
test("text extracted without spaces is reported as a spacing failure", async () => {
    const { resume } = await scoreText("SeniorEngineerAtAcmeCorporationBuildingPaymentsInfrastructure\nLedgerServiceHandlingTransactionsForMerchantsEveryYear\n");

    assert.equal(findingFor(resume, "wordSpacing").status, "fail");
});

test("undecodable characters are reported as a font problem", async () => {
    const { resume } = await scoreText(`EXPERIENCE\nEngineer at Acme${"".repeat(20)}\n`);

    assert.equal(findingFor(resume, "glyphIntegrity").status, "fail");
});

// A format we cannot inspect must say so rather than score as clean, or a DOCX would always beat a PDF.
test("checks that cannot run on a text file are reported as unchecked, not passed", async () => {
    const { resume } = await scoreText("EXPERIENCE\nEngineer at Acme Corporation building payments systems\n");

    assert.equal(findingFor(resume, "singleColumn").status, "unchecked");
    assert.equal(findingFor(resume, "readingOrder").status, "unchecked");
    assert.equal(resume.parseRisk.checksRun, 3);
    assert.equal(resume.parseRisk.checksTotal, 6);
});
