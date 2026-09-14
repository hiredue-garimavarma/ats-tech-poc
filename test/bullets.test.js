const test = require("node:test");
const assert = require("node:assert/strict");

const { describe: describeBullet, findBullets, summarise } = require("../src/domain/bullets");

test("a measured result is recognised however it is written", () => {
    const measured = ["- Cut p99 latency from 800ms to 210ms", "- Saved $4.2M in abandoned carts", "- Led a team of 9 engineers", "- Grew signups 40%", "- Handled 12B transactions"];

    for (const text of measured) {
        assert.equal(describeBullet(text).quantified, true, `"${text}" states a measured result`);
    }
});

// Time served is not an achievement, and counting it would let "5 years of experience" pass as a result.
test("a duration is not counted as a measured result", () => {
    assert.equal(describeBullet("- 5 years of experience in backend development").quantified, false);
    assert.equal(describeBullet("- Worked there for 18 months on the platform team").quantified, false);
});

test("duty phrasing is told apart from achievement phrasing", () => {
    assert.equal(describeBullet("- Responsible for the payments service").weakOpener, true);
    assert.equal(describeBullet("- Worked on the payments service").weakOpener, true);
    assert.equal(describeBullet("- Rebuilt the payments service").strongOpener, true);
    assert.equal(describeBullet("- Rebuilt the payments service").weakOpener, false);
});

test("first-person writing and filler phrases are flagged", () => {
    assert.equal(describeBullet("- I built the ledger service").firstPerson, true);
    assert.equal(describeBullet("- A detail-oriented team player").filler, true);
});

// A resume written in paragraphs genuinely has no bullets; inventing them would hide the problem an ATS summary screen exposes.
test("only lines carrying a bullet glyph are counted as bullets", () => {
    const lines = [{ text: "- Built the ledger service" }, { text: "Built the ledger service" }, { text: "• Led the migration" }];

    assert.equal(findBullets(lines).length, 2);
});

test("shares are null rather than zero when there are no bullets to measure", () => {
    assert.equal(summarise([]).quantifiedShare, null);
});
