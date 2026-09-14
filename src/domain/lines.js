// Groups positioned text items into visual lines, the unit every later rule reasons about.
// It deliberately does not un-scramble multi-column pages: it groups by row exactly as a naive ATS parser does, so a broken layout stays visible instead of being quietly repaired.

const { LINE_BASELINE_TOLERANCE_RATIO } = require("../constants");

function byReadingPosition(a, b) {
    // Descending y puts the top of the page first; x and then original order break ties so the sort is total and the output is identical on every run.
    return (b.y - a.y) || (a.x - b.x) || (a.order - b.order);
}

function finishLine(items, pageNumber) {
    const sorted = [...items].sort((a, b) => (a.x - b.x) || (a.order - b.order));

    const fontSize = Math.max(...sorted.map(item => item.fontSize));

    return {
        page: pageNumber,
        text: sorted.map(item => item.text).join(" ").replace(/\s+/g, " ").trim(),
        items: sorted,
        y: Math.max(...sorted.map(item => item.y)),
        left: Math.min(...sorted.map(item => item.x)),
        right: Math.max(...sorted.map(item => item.x + item.width)),
        fontSize,
        fontIds: [...new Set(sorted.map(item => item.fontId))].sort(),
        gapAbove: null
    };
}

function withGaps(lines) {
    return lines.map((line, index) => {
        if (index === 0) {
            return { ...line, gapAbove: null };
        }

        const previous = lines[index - 1];

        // Leading between two baselines minus the taller font is the blank space a reader sees, which is what separates a heading from the paragraph above it.
        return {
            ...line,
            gapAbove: previous.page === line.page
                ? (previous.y - line.y) - Math.max(previous.fontSize, line.fontSize)
                : null
        };
    });
}

function linesFromItems(items, pageNumber = 1) {
    if (items.length === 0) {
        return [];
    }

    const sorted = [...items].sort(byReadingPosition);

    const lines = [];
    let current = [sorted[0]];
    let baseline = sorted[0].y;
    let baselineFontSize = sorted[0].fontSize;

    for (const item of sorted.slice(1)) {
        const tolerance = LINE_BASELINE_TOLERANCE_RATIO * Math.max(baselineFontSize, item.fontSize);

        if (Math.abs(item.y - baseline) <= tolerance) {
            current.push(item);
            baselineFontSize = Math.max(baselineFontSize, item.fontSize);
            continue;
        }

        lines.push(finishLine(current, pageNumber));
        current = [item];
        baseline = item.y;
        baselineFontSize = item.fontSize;
    }

    lines.push(finishLine(current, pageNumber));

    return lines.filter(line => line.text !== "");
}

function linesFromPages(pages) {
    return withGaps(pages.flatMap(page => linesFromItems(page.items, page.number)));
}

// Formats without geometry still need lines; typography fields stay null so a rule can tell "no heading font here" from "we never looked".
function linesFromText(text) {
    const rawLines = text.split("\n");

    const lines = [];

    for (let index = 0; index < rawLines.length; index++) {
        const value = rawLines[index].trim();

        if (value === "") {
            continue;
        }

        lines.push({
            page: 1,
            text: value,
            items: [],
            y: -index,
            left: null,
            right: null,
            fontSize: null,
            fontIds: [],
            // A blank source line is the only "space above" signal a plain-text resume has.
            gapAbove: index > 0 && rawLines[index - 1].trim() === "" ? 1 : 0
        });
    }

    return lines;
}

function textFromLines(lines) {
    return lines.map(line => line.text).join("\n");
}

// The font size most of the document's characters are set in, which is the baseline a heading has to stand out from.
function bodyFontSize(lines) {
    const weights = new Map();

    for (const line of lines) {
        if (line.fontSize === null) {
            continue;
        }

        const key = Math.round(line.fontSize * 2) / 2;
        weights.set(key, (weights.get(key) || 0) + line.text.length);
    }

    if (weights.size === 0) {
        return null;
    }

    return [...weights.entries()]
        .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))[0][0];
}

module.exports = {
    linesFromItems,
    linesFromPages,
    linesFromText,
    textFromLines,
    bodyFontSize
};
