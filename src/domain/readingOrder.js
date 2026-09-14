// Measures how far a page's stored text order drifts from the order the page is read in.
// Two independent extractors disagree exactly where this number is high, so it predicts a parser scrambling the resume without needing a second parser to prove it.

const { linesFromItems } = require("./lines");
const { editDistance } = require("./similarity");

// Levenshtein is quadratic, so long documents are compared on their first tokens only; the bound keeps runtime fixed and the result reproducible.
const MAX_TOKENS = 4000;

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, MAX_TOKENS);
}

function divergence(page) {
    const streamTokens = tokenize(
        [...page.items].sort((a, b) => a.order - b.order).map(item => item.text).join(" ")
    );

    const geometricTokens = tokenize(
        linesFromItems(page.items, page.number).map(line => line.text).join(" ")
    );

    const longest = Math.max(streamTokens.length, geometricTokens.length);

    if (longest === 0) {
        return null;
    }

    return Number((editDistance(streamTokens, geometricTokens) / longest).toFixed(4));
}

// The worst page decides: one scrambled page is enough to lose a job history.
function worstDivergence(pages) {
    const scores = pages.map(divergence).filter(value => value !== null);

    if (scores.length === 0) {
        return null;
    }

    return Math.max(...scores);
}

module.exports = { divergence, worstDivergence };
