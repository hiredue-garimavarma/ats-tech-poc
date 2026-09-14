// Extracts the achievement lines from a resume and judges how each one is written.

const { BULLET_MIN_WORDS, BULLET_MAX_WORDS } = require("../constants");

// Durations are excluded on purpose: "3 years of experience" is a fact about time served, not a measured result.
const QUANTIFIED = /(?:[$₹€£]\s?\d[\d,.]*\s*(?:k|m|bn|b|million|billion|crore|lakhs?)?)|(?:\b\d[\d,.]*\s*(?:%|(?:percent|x|k|m|b|bn|million|billion|crore|lakhs?|users|customers|clients|requests|transactions|engineers|developers|people|teams|reports|hours|ms|seconds|days|records|services|stores|accounts|leads|deals|tickets|bugs|tests|repos|countries|markets|points|bps)\b))/i;

const STRONG_VERBS = new Set(["architected", "automated", "built", "consolidated", "coordinated", "created", "cut", "delivered", "deployed", "designed", "developed", "drove", "eliminated", "established", "expanded", "generated", "grew", "halved", "implemented", "improved", "increased", "integrated", "introduced", "launched", "led", "migrated", "mentored", "negotiated", "optimised", "optimized", "owned", "produced", "published", "rebuilt", "reduced", "refactored", "removed", "replaced", "resolved", "restructured", "scaled", "secured", "shipped", "simplified", "standardised", "standardized", "streamlined", "tripled", "doubled", "trained", "won"]);

const WEAK_OPENERS = [/^responsible for\b/i, /^worked on\b/i, /^helped\b/i, /^assisted\b/i, /^involved in\b/i, /^participated in\b/i, /^duties included\b/i, /^tasks included\b/i, /^handled\b/i, /^dealt with\b/i, /^part of\b/i];

const FILLER = [/\bteam player\b/i, /\bhard worker\b/i, /\bhard[- ]working\b/i, /\bgo[- ]getter\b/i, /\bsynergy\b/i, /\bthink outside the box\b/i, /\bdetail[- ]oriented\b/i, /\bself[- ]starter\b/i, /\bresults[- ]driven\b/i, /\bproven track record\b/i, /\bdynamic professional\b/i, /\bpassionate about\b/i, /\bexcellent communication skills\b/i];

const FIRST_PERSON = /\b(?:i|me|my|myself)\b/i;

const BULLET_GLYPH = /^\s*[-–—•●▪◦*·»]\s+/;

function stripGlyph(text) {
    return text.replace(BULLET_GLYPH, "").trim();
}

function describe(text) {
    const body = stripGlyph(text);
    const words = body.split(/\s+/).filter(Boolean);
    const firstWord = (words[0] || "").toLowerCase().replace(/[^a-z]/g, "");

    return {
        text: body,
        words: words.length,
        quantified: QUANTIFIED.test(body),
        strongOpener: STRONG_VERBS.has(firstWord),
        weakOpener: WEAK_OPENERS.some(pattern => pattern.test(body)),
        firstPerson: FIRST_PERSON.test(body),
        filler: FILLER.some(pattern => pattern.test(body)),
        wellSized: words.length >= BULLET_MIN_WORDS && words.length <= BULLET_MAX_WORDS
    };
}

// Only lines that carry a bullet glyph count. A resume written in paragraphs genuinely has no bullets, and inventing them would hide that.
function findBullets(lines) {
    return lines
        .filter(line => BULLET_GLYPH.test(line.text))
        .map(line => describe(line.text));
}

function share(bullets, predicate) {
    if (bullets.length === 0) {
        return null;
    }

    return Number((bullets.filter(predicate).length / bullets.length).toFixed(4));
}

function summarise(bullets) {
    return {
        count: bullets.length,
        quantifiedShare: share(bullets, bullet => bullet.quantified),
        strongOpenerShare: share(bullets, bullet => bullet.strongOpener),
        weakOpenerShare: share(bullets, bullet => bullet.weakOpener),
        wellSizedShare: share(bullets, bullet => bullet.wellSized),
        firstPersonCount: bullets.filter(bullet => bullet.firstPerson).length,
        fillerCount: bullets.filter(bullet => bullet.filler).length
    };
}

module.exports = { findBullets, summarise, describe };
