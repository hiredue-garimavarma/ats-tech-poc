// Finds the vertical gutters that split a page into columns.
// A gutter matters because ATS parsers read a page row by row: text either side of one gets interleaved, so a sidebar's skills land in the middle of a job title.

const {
    GUTTER_MIN_WIDTH_RATIO,
    GUTTER_ZONE,
    COLUMN_MIN_ITEM_SHARE,
    COLUMN_MIN_HEIGHT_SHARE
} = require("../constants");

// Fewer items than this is a cover page or a header block, where a wide blank strip is whitespace rather than a column boundary.
const MIN_ITEMS_TO_JUDGE = 20;

function textBounds(items) {
    return {
        left: Math.min(...items.map(item => item.x)),
        right: Math.max(...items.map(item => item.x + item.width)),
        bottom: Math.min(...items.map(item => item.y)),
        top: Math.max(...items.map(item => item.y))
    };
}

// One entry per point of page width, counting how many items cover it.
function occupancy(items, bounds) {
    const width = Math.ceil(bounds.right - bounds.left) + 1;
    const covered = new Uint32Array(width);

    for (const item of items) {
        const start = Math.max(0, Math.floor(item.x - bounds.left));
        const end = Math.min(width - 1, Math.ceil(item.x + item.width - bounds.left));

        for (let position = start; position <= end; position++) {
            covered[position] += 1;
        }
    }

    return covered;
}

function emptyRuns(covered) {
    const runs = [];
    let start = null;

    for (let position = 0; position < covered.length; position++) {
        if (covered[position] === 0 && start === null) {
            start = position;
        }

        if (covered[position] !== 0 && start !== null) {
            runs.push({ start, end: position });
            start = null;
        }
    }

    // A trailing run touches the right edge of the text block, which is a margin and not a gutter.
    return runs;
}

function verticalSpan(items) {
    if (items.length === 0) {
        return 0;
    }

    return Math.max(...items.map(item => item.y)) - Math.min(...items.map(item => item.y));
}

function findGutters(page) {
    const items = page.items;

    if (items.length < MIN_ITEMS_TO_JUDGE) {
        return [];
    }

    const bounds = textBounds(items);
    const textWidth = bounds.right - bounds.left;
    const textHeight = bounds.top - bounds.bottom;

    if (textWidth <= 0 || textHeight <= 0) {
        return [];
    }

    const gutters = [];

    for (const run of emptyRuns(occupancy(items, bounds))) {
        const runWidth = run.end - run.start;

        if (runWidth < GUTTER_MIN_WIDTH_RATIO * page.width) {
            continue;
        }

        const centre = (run.start + run.end) / 2 / textWidth;

        if (centre < GUTTER_ZONE[0] || centre > GUTTER_ZONE[1]) {
            continue;
        }

        const splitX = bounds.left + run.start;
        const resumeX = bounds.left + run.end;

        const left = items.filter(item => item.x + item.width <= splitX + 1);
        const right = items.filter(item => item.x >= resumeX - 1);

        const leftShare = left.length / items.length;
        const rightShare = right.length / items.length;

        if (leftShare < COLUMN_MIN_ITEM_SHARE || rightShare < COLUMN_MIN_ITEM_SHARE) {
            continue;
        }

        // Both sides must run most of the page: a two-up skills grid occupies one band and is not a column layout.
        if (verticalSpan(left) < COLUMN_MIN_HEIGHT_SHARE * textHeight) {
            continue;
        }

        if (verticalSpan(right) < COLUMN_MIN_HEIGHT_SHARE * textHeight) {
            continue;
        }

        gutters.push({
            page: page.number,
            x: splitX,
            width: runWidth,
            leftShare: Number(leftShare.toFixed(4)),
            rightShare: Number(rightShare.toFixed(4))
        });
    }

    return gutters;
}

module.exports = { findGutters };
