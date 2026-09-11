// ============================================================
// ATS ANALYZER
// Deterministic resume signals only.
// No JD matching, NLP, or predefined job-specific skills.
// ============================================================

const SECTIONS = {
    summary: ["summary", "professional summary", "profile", "objective"],
    experience: ["experience", "work experience", "professional experience"],
    education: ["education", "academic background", "qualifications"],
    skills: ["skills", "technical skills", "core skills", "key skills", "technologies"],
    projects: ["projects", "personal projects", "academic projects"],
    certifications: ["certifications", "certificates", "licenses"],
    publications: ["publications", "research", "papers"]
};

function cleanLine(line) {
    return line
        .toLowerCase()
        .replace(/[:|•\-]+/g, "")
        .trim();
}

function countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
}

function countBullets(text) {
    return (
        text.match(/(^|\n)\s*[-•●▪◦*]\s+/g) || []
    ).length;
}

function extractContact(text) {
    const email = text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    )?.[0] || null;

    const phone = text.match(
        /(?:\+?\d[\d\s().-]{8,}\d)/
    )?.[0] || null;

    const linkedinUrl =
        /linkedin\.com\/(?:in|pub)\//i.test(text);

    const linkedinMention =
        /\blinkedin\b/i.test(text);

    return {
        email,
        phone,
        linkedin: linkedinUrl,
        linkedinMention
    };
}

function detectSections(text) {
    const lines = text
        .split("\n")
        .map(cleanLine)
        .filter(Boolean);

    return Object.fromEntries(
        Object.entries(SECTIONS).map(([section, aliases]) => [
            section,
            aliases.some(alias => lines.includes(alias))
        ])
    );
}

function extractSectionText(text, sectionName) {
    const aliases = SECTIONS[sectionName];

    if (!aliases) {
        return "";
    }

    const lines = text.split("\n");

    const startIndex = lines.findIndex(
        line => aliases.includes(cleanLine(line))
    );

    if (startIndex === -1) {
        return "";
    }

    const sectionNames = Object.values(SECTIONS).flat();

    const sectionLines = [];

    for (let i = startIndex + 1; i < lines.length; i++) {
        const cleaned = cleanLine(lines[i]);

        if (sectionNames.includes(cleaned)) {
            break;
        }

        sectionLines.push(lines[i]);
    }

    return sectionLines.join("\n");
}

function analyzeSkills(text, sections) {
    if (!sections.skills) {
        return {
            hasSection: false,
            entries: 0,
            duplicates: 0
        };
    }

    const sectionText = extractSectionText(text, "skills");
    const lines = sectionText.split("\n");

    const entries = [];

    for (const line of lines) {
        const parts = line
            .split(/[,|•;]/)
            .map(item => item.trim())
            .filter(Boolean);

        entries.push(...parts);
    }

    const normalized = entries.map(
        entry => entry.toLowerCase().replace(/\s+/g, " ")
    );

    return {
        hasSection: true,
        entries: entries.length,
        duplicates:
            normalized.length -
            new Set(normalized).size
    };
}

function getDateRanges(text) {
    return (
        text.match(
            /\b(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}\s*[-–—]\s*(?:(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:(?:19|20)\d{2}|present|current))\b/gi
        ) || []
    );
}

function analyzeExperience(text, sections) {
    if (!sections.experience) {
        return {
            hasExperience: false,
            bulletPoints: 0,
            quantifiedResults: 0,
            actionVerbs: 0,
            dateRanges: 0,
            chronological: true
        };
    }

    const experienceText =
        extractSectionText(text, "experience");

    const lowerText = experienceText.toLowerCase();

    const bulletPoints =
        countBullets(experienceText);

    const quantifiedResults =
        (
            experienceText.match(
                /\b\d+(?:\.\d+)?\s*(?:%|percent|k|m|million|billion|users|clients|customers|projects|years|months|hours|tests)\b/gi
            ) || []
        ).length;

    const dates = getDateRanges(experienceText);

    const years = dates
        .map(date => {
            const match =
                date.match(/\b(19|20)\d{2}\b/);

            return match
                ? Number(match[0])
                : 0;
        });

    const chronological =
        years.length < 2 ||
        years.every((year, i) =>
            i === 0 ||
            year <= years[i - 1]
        );

    return {
        hasExperience: true,
        bulletPoints,
        quantifiedResults,
        actionVerbs: 0,
        dateRanges: dates.length,
        chronological
    };
}

function analyzeEducation(text, sections) {
    if (!sections.education) {
        return {
            hasSection: false,
            degree: false,
            institution: false,
            date: false
        };
    }

    return {
        hasSection: true,
        degree:
            /\b(b\.?tech|b\.?e\.?|m\.?tech|m\.?e\.?|bachelor|master|ph\.?d)\b/i.test(text),

        institution:
            /\buniversity\b|\bcollege\b|\binstitute\b/i.test(text),

        date:
            /\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b/i.test(text)
    };
}

function analyzeProjects(text, sections) {
    return {
        hasSection: sections.projects
    };
}

function analyzeContent(text) {
    const lowerText = text.toLowerCase();

    const quantifiedResults =
        (
            text.match(
                /\b\d+(?:\.\d+)?\s*(?:%|percent|k|m|million|billion|users|clients|customers|projects|years|months|hours|tests)\b/gi
            ) || []
        ).length;

    const words = countWords(text);

    const repeatedTerms =
        (lowerText.match(/\b[a-z]{5,}\b/g) || [])
            .reduce((counts, word) => {
                counts[word] =
                    (counts[word] || 0) + 1;

                return counts;
            }, {});

    const repeated =
        Object.entries(repeatedTerms)
            .filter(([, count]) => count >= 6)
            .length;

    return {
        words,
        bulletPoints: countBullets(text),
        quantifiedResults,
        repeatedTerms: repeated
    };
}

function analyzeResume(text) {
    const sections = detectSections(text);

    const contact =
        extractContact(text);

    const skills =
        analyzeSkills(text, sections);

    const experience =
        analyzeExperience(text, sections);

    const education =
        analyzeEducation(text, sections);

    const projects =
        analyzeProjects(text, sections);

    const content =
        analyzeContent(text);

    return {
        sections,
        contact,
        skills,
        experience,
        education,
        projects,
        content
    };
}

module.exports = {
    analyzeResume
};
