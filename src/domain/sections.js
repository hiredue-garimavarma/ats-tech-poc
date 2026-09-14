// Decides which lines are section headings and what each section contains.
// It replaces exact-string matching: headings are recognised from wording, shape and typography together, so "WORK HISTORY" and "EXPERIENCE Acme Corp" both resolve to the experience section.

const { HEADER_FUZZY_MIN_RATIO, HEADER_MAX_WORDS, HEADER_FONT_SIZE_RATIO } = require("../constants");
const { similarity } = require("./similarity");

const SECTION_ALIASES = {
    summary: ["summary", "professional summary", "career summary", "executive summary", "profile", "professional profile", "objective", "career objective", "about me", "overview", "professional background"],
    experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "career history", "professional history", "relevant experience", "industry experience"],
    education: ["education", "academic background", "educational background", "academic qualifications", "qualifications", "academics"],
    skills: ["skills", "technical skills", "core skills", "key skills", "technical competencies", "core competencies", "competencies", "technologies", "technical expertise", "areas of expertise", "expertise", "proficiencies"],
    projects: ["projects", "personal projects", "academic projects", "selected projects", "key projects", "portfolio"],
    certifications: ["certifications", "certificates", "licenses", "licences", "credentials", "accreditations"],
    awards: ["awards", "honors", "honours", "achievements", "recognition"],
    publications: ["publications", "research", "papers", "patents"],
    languages: ["languages"],
    volunteer: ["volunteering", "volunteer experience", "community involvement", "extracurricular activities"],
    interests: ["interests", "hobbies"]
};

// Words that decorate a heading without changing which section it names, so "Relevant Work Experience" still resolves to experience.
const HEADING_MODIFIERS = new Set(["relevant", "technical", "professional", "key", "core", "selected", "additional", "other", "personal", "academic", "detailed", "highlights", "history", "background", "and", "&", "section", "details", "information", "my"]);

// A word following a heading that turns it into a sentence: "Experience with Kubernetes" is a bullet, not a section.
const RESIDUAL_CONTINUATIONS = new Set(["with", "in", "of", "on", "and", "or", "using", "across", "including", "at", "for", "to", "from", "as", "that", "which"]);

const ALIAS_INDEX = Object.entries(SECTION_ALIASES)
    .flatMap(([section, aliases]) => aliases.map(alias => ({ section, alias, tokens: alias.split(" ") })))
    // Longest first so "work experience" wins over "experience" and a residual is measured from the end of the fuller phrase.
    .sort((a, b) => (b.alias.length - a.alias.length) || a.alias.localeCompare(b.alias));

const ALIAS_TOKENS = new Set(ALIAS_INDEX.flatMap(entry => entry.tokens));

function normalizeToken(raw) {
    return raw.toLowerCase().replace(/[^a-z&]/g, "");
}

// Raw words are kept alongside their normalized form so a residual can be cut out of the original line without losing its punctuation or digits.
function tokenize(text) {
    const stripped = text.replace(/^[\s\-•●▪◦*|]+/, "").replace(/^\d+[.)]\s*/, "");
    const rawWords = stripped.split(/\s+/).filter(Boolean);

    const kept = [];

    rawWords.forEach((raw, index) => {
        const norm = normalizeToken(raw);

        if (norm !== "") {
            kept.push({ norm, index });
        }
    });

    return { rawWords, norms: kept.map(token => token.norm), indexes: kept.map(token => token.index) };
}

function startsWithBullet(text) {
    return /^\s*[-•●▪◦*]/.test(text);
}

function isAllCaps(text) {
    const letters = text.replace(/[^A-Za-z]/g, "");

    return letters.length >= 2 && letters === letters.toUpperCase();
}

function hasSpaceAbove(line) {
    if (line.gapAbove === null) {
        return false;
    }

    // Plain-text lines record a blank source line as 1; PDF lines record leading in points, where a third of the font size is a visible break.
    return line.fontSize === null
        ? line.gapAbove > 0
        : line.gapAbove > 0.35 * line.fontSize;
}

function isTypographicHeading(line, body) {
    const largerFont = line.fontSize !== null && body !== null && line.fontSize >= body * HEADER_FONT_SIZE_RATIO;

    return largerFont || isAllCaps(line.text);
}

function matchAlias({ norms }) {
    if (norms.length === 0) {
        return null;
    }

    const joined = norms.join(" ");

    for (const entry of ALIAS_INDEX) {
        if (joined === entry.alias) {
            return { section: entry.section, confidence: "exact", residualFrom: null };
        }
    }

    if (norms.length <= HEADER_MAX_WORDS) {
        for (const entry of ALIAS_INDEX) {
            if (similarity(joined, entry.alias) >= HEADER_FUZZY_MIN_RATIO) {
                return { section: entry.section, confidence: "fuzzy", residualFrom: null };
            }
        }
    }

    // A heading fused to its first line of content, which is how PDF extraction usually delivers one.
    for (const entry of ALIAS_INDEX) {
        if (norms.length <= entry.tokens.length) {
            continue;
        }

        if (!entry.tokens.every((token, position) => norms[position] === token)) {
            continue;
        }

        if (RESIDUAL_CONTINUATIONS.has(norms[entry.tokens.length])) {
            continue;
        }

        return { section: entry.section, confidence: "prefix", residualFrom: entry.tokens.length };
    }

    if (norms.length <= HEADER_MAX_WORDS) {
        for (const entry of ALIAS_INDEX) {
            if (!entry.tokens.every(token => norms.includes(token))) {
                continue;
            }

            const remainder = norms.filter(token => !entry.tokens.includes(token));

            // Everything the alias did not account for must itself be heading vocabulary, or the line is prose that merely mentions the word.
            if (remainder.every(token => HEADING_MODIFIERS.has(token) || ALIAS_TOKENS.has(token))) {
                return { section: entry.section, confidence: "contains", residualFrom: null };
            }
        }
    }

    return null;
}

function classifyLine(line, body = null) {
    if (startsWithBullet(line.text)) {
        return null;
    }

    const tokens = tokenize(line.text);
    const match = matchAlias(tokens);

    if (match === null) {
        // A short, set-apart, typographically distinct line naming no known section still ends the section above it.
        const looksLikeHeading = tokens.norms.length > 0
            && tokens.norms.length <= HEADER_MAX_WORDS
            && isTypographicHeading(line, body)
            && hasSpaceAbove(line);

        return looksLikeHeading ? { section: "other", confidence: "typography", residual: "" } : null;
    }

    if (match.residualFrom === null) {
        return { section: match.section, confidence: match.confidence, residual: "" };
    }

    // Splitting a line is only safe when it still looks like a heading; otherwise a sentence that happens to open with a section word gets torn in half.
    if (!isTypographicHeading(line, body) && !hasSpaceAbove(line)) {
        return null;
    }

    const residual = tokens.rawWords.slice(tokens.indexes[match.residualFrom]).join(" ");

    return { section: match.section, confidence: match.confidence, residual };
}

function detectSections(lines, body = null) {
    const headings = [];

    lines.forEach((line, index) => {
        const match = classifyLine(line, body);

        if (match !== null) {
            headings.push({ index, ...match, heading: line.text });
        }
    });

    const sections = {};

    headings.forEach((heading, position) => {
        if (heading.section === "other") {
            return;
        }

        const end = position + 1 < headings.length ? headings[position + 1].index : lines.length;
        const contentLines = lines.slice(heading.index + 1, end);

        const text = [heading.residual, ...contentLines.map(line => line.text)]
            .filter(value => value !== "")
            .join("\n");

        // A section repeated later in the resume continues the first one rather than replacing it.
        if (sections[heading.section]) {
            sections[heading.section].text += `\n${text}`;
            sections[heading.section].lines.push(...contentLines);
            return;
        }

        sections[heading.section] = {
            heading: heading.heading,
            confidence: heading.confidence,
            lines: contentLines,
            text
        };
    });

    return { headings, sections };
}

module.exports = { detectSections, classifyLine, SECTION_ALIASES };
