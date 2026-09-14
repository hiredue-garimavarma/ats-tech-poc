const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyLine, detectSections } = require("../src/domain/sections");
const { linesFromText } = require("../src/domain/lines");

const line = (text, extra = {}) => ({ text, fontSize: null, gapAbove: 1, ...extra });

test("a section is recognised from any of the names people actually use for it", () => {
    const names = ["EXPERIENCE", "Work Experience", "WORK HISTORY", "EMPLOYMENT", "Employment History", "Relevant Work Experience", "Career History", "EXPERIENCE:"];

    for (const name of names) {
        assert.equal(classifyLine(line(name))?.section, "experience", `"${name}" should name the experience section`);
    }
});

test("skills and education are recognised under their formal names", () => {
    assert.equal(classifyLine(line("TECHNICAL COMPETENCIES"))?.section, "skills");
    assert.equal(classifyLine(line("Core Competencies"))?.section, "skills");
    assert.equal(classifyLine(line("ACADEMIC QUALIFICATIONS"))?.section, "education");
    assert.equal(classifyLine(line("PROFESSIONAL BACKGROUND"))?.section, "summary");
});

// A misspelled heading is still a heading; this is what the fuzzy threshold exists for.
test("a heading survives a typo", () => {
    assert.equal(classifyLine(line("EXPERENCE"))?.section, "experience");
    assert.equal(classifyLine(line("EDUCATON"))?.section, "education");
});

// PDF extraction routinely fuses a heading to the first line of its content, and the old exact-match detector lost the whole section when it did.
test("a heading fused to its first line of content keeps both", () => {
    const match = classifyLine(line("EXPERIENCE Acme Corp, Senior Engineer"));

    assert.equal(match.section, "experience");
    assert.equal(match.residual, "Acme Corp, Senior Engineer");
});

test("a fused heading keeps punctuation and digits in its residual", () => {
    assert.equal(classifyLine(line("EXPERIENCE Acme Corp (2020)")).residual, "Acme Corp (2020)");
});

// The guard that makes fused headings safe: without it, any sentence opening with a section word gets torn in half.
test("a sentence that merely opens with a section word is not a heading", () => {
    assert.equal(classifyLine(line("Experience with Kubernetes and Terraform")), null);
    assert.equal(classifyLine(line("- Experience with Kubernetes")), null);
    assert.equal(classifyLine(line("Experience Acme Corp, Senior Engineer", { gapAbove: 0 })), null);
});

test("ordinary resume prose is never mistaken for a heading", () => {
    const prose = ["Led a team of nine engineers across three timezones", "Cut p99 latency from 800ms to 210ms", "Senior Staff Engineer, Stripe (Mar 2021 - Present)", "MS Computer Science, Stanford University, 2016"];

    for (const text of prose) {
        assert.equal(classifyLine(line(text)), null, `"${text}" should not be a heading`);
    }
});

test("a section ends where the next heading begins", () => {
    const lines = linesFromText("WORK HISTORY\nEngineer at Acme\n\nTECHNICAL COMPETENCIES\nGo, Rust\n");
    const { sections } = detectSections(lines);

    assert.equal(sections.experience.text, "Engineer at Acme");
    assert.equal(sections.skills.text, "Go, Rust");
});

// An unknown heading has to close the section above it, or the skills list swallows the rest of the resume.
test("an unrecognised heading still closes the section above it", () => {
    const lines = linesFromText("SKILLS\nGo, Rust\n\nSPEAKING ENGAGEMENTS\nKubeCon 2024\n");
    const { sections } = detectSections(lines);

    assert.equal(sections.skills.text, "Go, Rust");
});

test("a section split across two places in the resume is joined, not replaced", () => {
    const lines = linesFromText("EXPERIENCE\nAcme\n\nEDUCATION\nStanford\n\nEXPERIENCE\nSquare\n");
    const { sections } = detectSections(lines);

    assert.match(sections.experience.text, /Acme/);
    assert.match(sections.experience.text, /Square/);
});
