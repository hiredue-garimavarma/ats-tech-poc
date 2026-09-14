// Assembles one analysed resume from a read document: every signal the scorer needs, and nothing about how to weigh them.

const { linesFromPages, linesFromText, bodyFontSize } = require("./lines");
const { detectSections } = require("./sections");
const { findContact } = require("./contact");
const { findRanges, timeline } = require("./dates");
const { findBullets, summarise } = require("./bullets");
const { assessParseRisk } = require("./parseRisk");

function skillEntries(section) {
    if (!section) {
        return { entries: [], duplicates: 0 };
    }

    const entries = section.text
        .split(/[,;|•·\n]/)
        .map(entry => entry.replace(/^[\s\-–—*]+/, "").trim())
        .filter(entry => entry !== "" && entry.length <= 60);

    const normalized = entries.map(entry => entry.toLowerCase().replace(/\s+/g, " "));

    return { entries, duplicates: normalized.length - new Set(normalized).size };
}

function analyseResume(document, { now = new Date() } = {}) {
    const lines = document.hasGeometry
        ? linesFromPages(document.pages)
        : linesFromText(document.text);

    const body = bodyFontSize(lines);
    const { headings, sections } = detectSections(lines, body);

    // Bullets are counted across the whole resume, because achievements live under projects and volunteering as well as under experience.
    const bullets = findBullets(lines);

    const experienceText = sections.experience ? sections.experience.text : "";

    return {
        format: document.format,
        text: document.text,
        lines,
        bodyFontSize: body,
        headings,
        sections,
        contact: findContact(document.text),
        skills: skillEntries(sections.skills),
        bullets,
        bulletStats: summarise(bullets),
        timeline: timeline(findRanges(experienceText), { now }),
        parseRisk: assessParseRisk(document),
        wordCount: document.text.split(/\s+/).filter(Boolean).length
    };
}

module.exports = { analyseResume };
