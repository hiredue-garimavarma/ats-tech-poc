// Reads employment date ranges out of a resume and reports what the timeline implies.
// It deliberately does not judge how long ago the last role ended: that answer changes with the calendar, and a score that drifts on its own cannot be trusted.

const { EMPLOYMENT_GAP_MONTHS } = require("../constants");

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MONTH = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const PRESENT = "present|current|now|ongoing|to\\s*date|till\\s*date";
const ENDPOINT = `(?:(?:(${MONTH})|(\\d{1,2})[\\/.])[\\s\\/.]*)?((?:19|20)\\d{2})`;

const RANGE = new RegExp(`${ENDPOINT}\\s*(?:[-–—]|\\bto\\b)\\s*(?:${ENDPOINT}|(${PRESENT}))`, "gi");

function monthNumber(name, numeric) {
    if (numeric) {
        const value = Number(numeric);

        return value >= 1 && value <= 12 ? value : null;
    }

    if (!name) {
        return null;
    }

    return MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

// Months since year zero, so two points on a timeline can be compared and subtracted directly.
function absoluteMonths(year, month) {
    return (year * 12) + ((month || 1) - 1);
}

function findRanges(text) {
    const ranges = [];

    for (const match of text.matchAll(RANGE)) {
        const [raw, startName, startNumeric, startYear, endName, endNumeric, endYear, present] = match;

        const start = { year: Number(startYear), month: monthNumber(startName, startNumeric) };

        const end = present
            ? { present: true, year: null, month: null }
            : { present: false, year: Number(endYear), month: monthNumber(endName, endNumeric) };

        ranges.push({ raw: raw.trim(), index: match.index, start, end });
    }

    return ranges;
}

function timeline(ranges, { now = new Date() } = {}) {
    if (ranges.length === 0) {
        return { ranges: [], reverseChronological: null, gaps: [], overlaps: 0, futureDates: 0 };
    }

    const nowMonths = absoluteMonths(now.getUTCFullYear(), now.getUTCMonth() + 1);

    const points = ranges.map(range => ({
        raw: range.raw,
        from: absoluteMonths(range.start.year, range.start.month),
        to: range.end.present ? nowMonths : absoluteMonths(range.end.year, range.end.month)
    }));

    // Resumes are read newest first, so the ranges should already descend as they appear on the page.
    const reverseChronological = points.every((point, index) => index === 0 || point.from <= points[index - 1].from);

    const ordered = [...points].sort((a, b) => (a.from - b.from) || (a.to - b.to) || a.raw.localeCompare(b.raw));

    const gaps = [];
    let overlaps = 0;
    let covered = ordered[0].to;

    for (const point of ordered.slice(1)) {
        const months = point.from - covered;

        if (months >= EMPLOYMENT_GAP_MONTHS) {
            gaps.push({ months, before: point.raw });
        }

        if (months < 0) {
            overlaps += 1;
        }

        covered = Math.max(covered, point.to);
    }

    const futureDates = points.filter(point => point.from > nowMonths).length;

    return { ranges: points, reverseChronological, gaps, overlaps, futureDates };
}

module.exports = { findRanges, timeline };
