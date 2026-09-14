const test = require("node:test");
const assert = require("node:assert/strict");

const { findRanges, timeline } = require("../src/domain/dates");

test("date ranges are read in the formats resumes write them in", () => {
    const found = findRanges("Acme (Mar 2021 - Present)\nSquare 2016 – 2021\nBeta 03/2014 to 06/2016");

    assert.equal(found.length, 3);
    assert.equal(found[0].start.year, 2021);
    assert.equal(found[0].start.month, 3);
    assert.equal(found[0].end.present, true);
    assert.equal(found[2].start.month, 3);
    assert.equal(found[2].end.year, 2016);
});

test("roles listed newest first are recognised as reverse-chronological", () => {
    assert.equal(timeline(findRanges("Acme 2021 - 2024\nSquare 2016 - 2021")).reverseChronological, true);
    assert.equal(timeline(findRanges("Square 2016 - 2021\nAcme 2021 - 2024")).reverseChronological, false);
});

// A gap is measured between roles only: measuring to today would make the score drift every month on its own.
test("a break between two roles is reported as a gap", () => {
    const gaps = timeline(findRanges("Acme Jan 2022 - Dec 2023\nSquare Jan 2016 - Jan 2020")).gaps;

    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].months, 24);
});

test("a short break between roles is not reported as a gap", () => {
    assert.equal(timeline(findRanges("Acme Jun 2020 - Dec 2023\nSquare Jan 2016 - Mar 2020")).gaps.length, 0);
});

test("concurrent roles are counted as overlapping", () => {
    assert.equal(timeline(findRanges("Acme 2020 - 2024\nSquare 2018 - 2022")).overlaps, 1);
});
