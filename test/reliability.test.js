// The suite that decides whether the score can be trusted: the same resume must score the same, an equivalent resume must score the same, and a better resume must score higher.

const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreText, scorePdf } = require("./helpers/score");
const { singleColumnPdf, twoColumnPdf } = require("./helpers/buildPdf");

const HEADER = "Jane Smith | jane.smith@corp.com | (415) 555-0199 | linkedin.com/in/janesmith";

const BODY = {
    summary: ["Staff engineer with eleven years building payments infrastructure."],
    experience: [
        "Senior Engineer, Stripe (Mar 2021 - Present)",
        "- Cut p99 checkout latency from 800ms to 210ms across the payments platform",
        "- Responsible for the billing service and its on-call rotation each quarter",
        "- Worked on the migration of several internal services to a new deployment",
        "Engineer, Square (Jan 2016 - Feb 2021)",
        "- Built a ledger service used across the merchant platform for reconciliation",
        "- Helped the team improve nightly batch processing and reporting pipelines"
    ],
    education: ["MS Computer Science, Stanford University, 2016"],
    skills: ["Go, Rust, Kubernetes, Postgres, Kafka, Terraform, gRPC"],
    projects: ["- Published an open-source ledger toolkit adopted by 300 teams"]
};

const STANDARD_HEADINGS = { summary: "SUMMARY", experience: "EXPERIENCE", education: "EDUCATION", skills: "SKILLS", projects: "PROJECTS" };
const RENAMED_HEADINGS = { summary: "PROFESSIONAL BACKGROUND", experience: "WORK HISTORY", education: "ACADEMIC QUALIFICATIONS", skills: "TECHNICAL COMPETENCIES", projects: "SELECTED PROJECTS" };

const ORDER = ["summary", "experience", "education", "skills", "projects"];
const SHUFFLED = ["summary", "skills", "experience", "projects", "education"];

function render(headings = STANDARD_HEADINGS, order = ORDER) {
    return [HEADER, "", ...order.flatMap(key => [headings[key], ...BODY[key], ""])].join("\n");
}

// A resume with the same words as render() but every bullet carrying a measured result.
const STRONG = [
    HEADER, "", "SUMMARY", "Staff engineer with eleven years building payments infrastructure.", "",
    "EXPERIENCE", "Senior Engineer, Stripe (Mar 2021 - Present)",
    "- Cut p99 checkout latency from 800ms to 210ms, saving $4.2M in abandoned carts",
    "- Led a team of 9 engineers across three timezones through a platform rewrite",
    "- Migrated 400 services off a monolith with zero downtime over eighteen months",
    "Engineer, Square (Jan 2016 - Feb 2021)",
    "- Built a ledger service handling 12B transactions annually for 40k merchants",
    "- Reduced nightly reconciliation from 6 hours to 20 minutes by resharding", "",
    "EDUCATION", "MS Computer Science, Stanford University, 2016", "",
    "SKILLS", "Go, Rust, Kubernetes, Postgres, Kafka, Terraform, gRPC", "",
    "PROJECTS", "- Published an open-source ledger toolkit adopted by 300 teams", ""
].join("\n");

const KEYWORD_STUFFED = [
    "John Doe", "john@example.com", "+1 555 123 4567", "linkedin.com/in/johndoe", "",
    "SUMMARY", "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod", "",
    "EXPERIENCE", "Acme Corp 2020 - 2024",
    "- did stuff banana banana banana and some other things here each day",
    "- responsible for more stuff and various items of work over the period",
    "- widgets and things that were handled by the team over a long time", "",
    "EDUCATION", "B.Tech, Some University 2014 - 2018", "",
    "SKILLS", "alpha, beta, gamma, delta, epsilon, zeta, eta, theta", "",
    "PROJECTS", "Thing one", ""
].join("\n");

const SIDEBAR = ["CONTACT", "jane@corp.com", "(415) 555-0199", "SKILLS", "Go", "Rust", "Kubernetes", "Postgres", "Kafka", "Terraform", "gRPC", "Redis", "Kotlin", "Swift", "AWS"];

const asLines = text => text.split("\n").filter(line => line.trim() !== "");

test("the same file scored twice produces exactly the same result", async () => {
    const first = await scoreText(render());
    const second = await scoreText(render());

    assert.deepEqual(first.score, second.score);
});

test("the same PDF scored twice produces exactly the same result", async () => {
    const pdf = singleColumnPdf(asLines(render()));

    const first = await scorePdf(pdf);
    const second = await scorePdf(pdf);

    assert.deepEqual(first.score, second.score);
});

// Renaming every heading is the perturbation the previous scorer failed hardest: it moved the same resume by 55 points.
test("renaming every section heading does not move the score", async () => {
    const standard = await scoreText(render(STANDARD_HEADINGS));
    const renamed = await scoreText(render(RENAMED_HEADINGS));

    assert.equal(renamed.score.headline, standard.score.headline);
    assert.deepEqual(Object.keys(renamed.resume.sections).sort(), Object.keys(standard.resume.sections).sort());
});

test("reordering the sections does not move the score", async () => {
    const original = await scoreText(render(STANDARD_HEADINGS, ORDER));
    const shuffled = await scoreText(render(STANDARD_HEADINGS, SHUFFLED));

    assert.equal(shuffled.score.headline, original.score.headline);
});

// The same resume exported to a different format has to score the same, or the tool is rating the exporter rather than the resume.
test("the same content as text and as a single-column PDF scores the same", async () => {
    const text = await scoreText(render());
    const pdf = await scorePdf(singleColumnPdf(asLines(render())));

    assert.equal(pdf.score.quality, text.score.quality);
    assert.ok(Math.abs(pdf.score.headline - text.score.headline) <= 5, `PDF ${pdf.score.headline} vs text ${text.score.headline}`);
});

test("better resumes score higher than worse ones, in order", async () => {
    const strong = await scoreText(STRONG);
    const middling = await scoreText(render());
    const stuffed = await scoreText(KEYWORD_STUFFED);
    const broken = await scorePdf(twoColumnPdf(SIDEBAR, asLines(STRONG), { leftX: 50, rightX: 230 }));

    const ranking = [strong.score.headline, middling.score.headline, stuffed.score.headline, broken.score.headline];

    assert.deepEqual(ranking, [...ranking].sort((a, b) => b - a), `ranking was ${ranking.join(" > ")}`);
    assert.ok(strong.score.headline - stuffed.score.headline >= 20, `strong ${strong.score.headline} vs stuffed ${stuffed.score.headline}`);
});

// A scale where every resume lands within a few points of the next tells a candidate nothing about where they stand.
test("each quality tier is separated from the next by a visible margin", async () => {
    const scores = [
        (await scoreText(STRONG)).score.headline,
        (await scoreText(render())).score.headline,
        (await scoreText(KEYWORD_STUFFED)).score.headline,
        (await scorePdf(twoColumnPdf(SIDEBAR, asLines(STRONG), { leftX: 50, rightX: 230 }))).score.headline
    ];

    const gaps = scores.slice(1).map((value, index) => scores[index] - value);

    assert.ok(Math.min(...gaps) >= 8, `tier scores were ${scores.join(", ")}, gaps ${gaps.join(", ")}`);
});
