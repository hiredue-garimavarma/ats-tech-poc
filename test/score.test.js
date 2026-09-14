const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreResume } = require("../src/domain/score");
const { scoreText } = require("./helpers/score");

// A resume that reads beautifully and parses badly, built directly so the cap can be tested without a layout that also breaks section detection.
function resumeWith(parseHealth) {
    return {
        contact: { email: "jane@corp.com", phone: "(415) 555-0199", linkedin: "linkedin.com/in/jane", github: null, website: null, linkedinMentionOnly: false },
        sections: { summary: { heading: "SUMMARY" }, experience: { heading: "EXPERIENCE" }, education: { heading: "EDUCATION" }, skills: { heading: "SKILLS" }, projects: { heading: "PROJECTS" } },
        skills: { entries: ["Go", "Rust"], duplicates: 0 },
        bulletStats: { count: 8, quantifiedShare: 1, strongOpenerShare: 1, weakOpenerShare: 0, wellSizedShare: 1, firstPersonCount: 0, fillerCount: 0 },
        timeline: { ranges: [{ from: 1, to: 2 }], reverseChronological: true, gaps: [], overlaps: 0, futureDates: 0 },
        parseRisk: { health: parseHealth, checksRun: 6, checksTotal: 6, findings: [] }
    };
}

test("a perfectly written resume still cannot beat the score of how readable its file is", () => {
    const score = scoreResume(resumeWith(40));

    assert.equal(score.quality, 100);
    assert.equal(score.headline, 40);
    assert.equal(score.cappedByParseHealth, true);
});

test("parse health only caps, it never lifts a weak resume", () => {
    const score = scoreResume(resumeWith(100));

    assert.equal(score.headline, score.quality);
    assert.equal(score.cappedByParseHealth, false);
});

// Nothing scored may read the clock, or the same resume would drift as months pass.
test("the score does not change with the date it is calculated on", async () => {
    const resume = "PROFESSIONAL BACKGROUND\nEngineer.\n\nWORK HISTORY\nEngineer, Acme (2016 - 2019)\n- Cut deploy time from 40 minutes to 6 minutes for 200 engineers\n\nEDUCATION\nBSc, Stanford University, 2016\n\nSKILLS\nGo, Rust\n";

    const early = await scoreText(resume, { now: new Date("2026-01-01T00:00:00Z") });
    const late = await scoreText(resume, { now: new Date("2035-01-01T00:00:00Z") });

    assert.deepEqual(early.score, late.score);
});

// Skipping an unanswerable question is different from answering it badly; the denominator has to shrink with it.
test("a check that could not run is left out of the average rather than scored as zero", async () => {
    const { resume } = await scoreText("EXPERIENCE\nEngineer at Acme Corporation building payment systems for merchants across Europe and Asia\n- Built a ledger service handling twelve billion transactions each year\n");

    assert.equal(resume.parseRisk.checksRun, 3);
    assert.equal(resume.parseRisk.health, 100);
});

test("a resume with no dated roles is not penalised for having no chronology", async () => {
    const { score } = await scoreText("EXPERIENCE\nEngineer at Acme\n- Built a ledger service handling twelve billion transactions a year\n");

    const chronology = score.contentStrength.items.find(entry => entry.id === "chronology");

    assert.equal(chronology.status, "unchecked");
});
