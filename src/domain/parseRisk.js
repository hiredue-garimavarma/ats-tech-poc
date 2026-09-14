// Decides whether a machine can read the file at all, and how badly it is likely to garble it.
// Every finding says which of pass, warn, fail or unchecked it is, because "this format has no geometry to inspect" is a different fact from "this layout is clean".

const {
    MIN_CHARS_PER_PAGE,
    PAGE_MARGIN_BAND_RATIO,
    READING_ORDER_SAFE_DIVERGENCE,
    READING_ORDER_SEVERE_DIVERGENCE,
    PRIVATE_USE_AREA,
    MAX_MEDIAN_TOKEN_LENGTH
} = require("../constants");

const { findGutters } = require("./columns");
const { worstDivergence } = require("./readingOrder");
const { hasContactDetails } = require("./contact");

const CHECKS = {
    textLayer: { weight: 30, label: "Text layer an ATS can read" },
    singleColumn: { weight: 25, label: "Single-column layout" },
    readingOrder: { weight: 20, label: "Stored order matches visual order" },
    marginBand: { weight: 10, label: "Nothing stranded in header or footer" },
    glyphIntegrity: { weight: 10, label: "Characters decode to real text" },
    wordSpacing: { weight: 5, label: "Word spacing survived extraction" }
};

const CREDIT = { pass: 1, warn: 0.5, fail: 0 };

function finding(id, status, detail) {
    return { id, label: CHECKS[id].label, weight: CHECKS[id].weight, status, detail };
}

function textLayer(document) {
    const pageCount = Math.max(document.pages.length, 1);
    const perPage = document.text.replace(/\s/g, "").length / pageCount;

    if (document.text.trim() === "") {
        return finding("textLayer", "fail", "No text could be extracted. The file is an image or a scan, and an ATS will read nothing at all.");
    }

    if (perPage < MIN_CHARS_PER_PAGE) {
        return finding("textLayer", "warn", `Only ${Math.round(perPage)} characters per page were extractable, which suggests most of the page is an image.`);
    }

    return finding("textLayer", "pass", `${Math.round(perPage)} characters per page extracted.`);
}

function singleColumn(document) {
    if (!document.hasGeometry) {
        return finding("singleColumn", "unchecked", `Column layout cannot be inspected in a ${document.format.toUpperCase()} file.`);
    }

    const gutters = document.pages.flatMap(findGutters);

    if (gutters.length === 0) {
        return finding("singleColumn", "pass", "Single-column layout on every page.");
    }

    const pages = [...new Set(gutters.map(gutter => gutter.page))].sort((a, b) => a - b);

    return finding("singleColumn", "fail", `A column gutter ${Math.round(gutters[0].width)}pt wide splits page ${pages.join(", ")}. ATS parsers read across the gutter, so the sidebar gets interleaved into the main column.`);
}

function readingOrder(document) {
    if (!document.hasGeometry) {
        return finding("readingOrder", "unchecked", `Reading order cannot be inspected in a ${document.format.toUpperCase()} file.`);
    }

    const worst = worstDivergence(document.pages);

    if (worst === null) {
        return finding("readingOrder", "unchecked", "No text items to compare.");
    }

    const percent = `${(worst * 100).toFixed(1)}%`;

    if (worst <= READING_ORDER_SAFE_DIVERGENCE) {
        return finding("readingOrder", "pass", `Stored order and visual order agree to within ${percent}.`);
    }

    if (worst <= READING_ORDER_SEVERE_DIVERGENCE) {
        return finding("readingOrder", "warn", `Stored order and visual order differ by ${percent}; some parsers will reorder parts of the resume.`);
    }

    return finding("readingOrder", "fail", `Stored order and visual order differ by ${percent}. Two parsers reading this file will disagree about what it says.`);
}

function marginBand(document) {
    if (!document.hasGeometry) {
        return finding("marginBand", "unchecked", `Header and footer regions cannot be inspected in a ${document.format.toUpperCase()} file.`);
    }

    const suspects = [];

    for (const page of document.pages) {
        const band = PAGE_MARGIN_BAND_RATIO * page.height;

        // On a single page the top band is where the candidate's name legitimately sits, so only the footer is examined; a running header is only provable once it repeats.
        const inBand = page.items.filter(item => item.y <= band
            || (document.pages.length > 1 && item.y >= page.height - band));

        if (inBand.length > 0) {
            suspects.push({ page: page.number, text: inBand.map(item => item.text).join(" ") });
        }
    }

    if (suspects.length === 0) {
        return finding("marginBand", "pass", "Nothing sits in the header or footer margin.");
    }

    const withContact = suspects.filter(suspect => hasContactDetails(suspect.text));

    if (withContact.length > 0) {
        return finding("marginBand", "fail", `Contact details sit in the page ${withContact[0].page} header or footer margin, which several ATS parsers discard entirely.`);
    }

    return finding("marginBand", "warn", `Text sits in the header or footer margin on page ${suspects[0].page} and may be dropped.`);
}

function glyphIntegrity(document) {
    const replacements = (document.text.match(/�/g) || []).length;

    const privateUse = [...document.text]
        .filter(character => {
            const code = character.codePointAt(0);

            return code >= PRIVATE_USE_AREA[0] && code <= PRIVATE_USE_AREA[1];
        })
        .length;

    if (replacements + privateUse === 0) {
        return finding("glyphIntegrity", "pass", "Every character decoded to real text.");
    }

    return finding("glyphIntegrity", replacements + privateUse > 10 ? "fail" : "warn", `${replacements + privateUse} characters did not decode, which means a font is embedded without a character map. An ATS stores these as mojibake.`);
}

function wordSpacing(document) {
    const tokens = document.text.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
        return finding("wordSpacing", "unchecked", "No text to measure.");
    }

    const lengths = tokens.map(token => token.length).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];

    if (median <= MAX_MEDIAN_TOKEN_LENGTH) {
        return finding("wordSpacing", "pass", `Median word length ${median} characters.`);
    }

    return finding("wordSpacing", "fail", `Median word length is ${median} characters, so the space character was lost during extraction and words are running together.`);
}

function assessParseRisk(document) {
    const findings = [
        textLayer(document),
        singleColumn(document),
        readingOrder(document),
        marginBand(document),
        glyphIntegrity(document),
        wordSpacing(document)
    ];

    const assessed = findings.filter(finding => finding.status !== "unchecked");

    const available = assessed.reduce((total, finding) => total + finding.weight, 0);
    const earned = assessed.reduce((total, finding) => total + (finding.weight * CREDIT[finding.status]), 0);

    return {
        // With no check able to run there is no evidence either way, and reporting a perfect score would be a lie.
        health: available === 0 ? null : Math.round((earned / available) * 100),
        checksRun: assessed.length,
        checksTotal: findings.length,
        findings
    };
}

module.exports = { assessParseRisk };
