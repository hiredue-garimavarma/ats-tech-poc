// ============================================================
// ATS SCORING ENGINE
// Resume-only, deterministic scoring.
// No JD matching, NLP, or predefined job-specific skills.
// ============================================================

function calculateScore({
    text,
    sections,
    contact,
    skills,
    experience,
    education,
    content
}) {
    const breakdown = {};

    // --------------------------------------------------------
    // 1. Parseability - 15
    // --------------------------------------------------------

    let parseability = 0;

    if (text.length > 100) parseability += 7;
    if (content.words >= 150) parseability += 4;
    if (content.words >= 300) parseability += 2;
    if (contact.email) parseability += 1;
    if (contact.phone) parseability += 1;

    breakdown.parseability = Math.min(parseability, 15);

    // --------------------------------------------------------
    // 2. Structure - 15
    // --------------------------------------------------------

    let structure = 0;

    if (sections.summary) structure += 2;
    if (sections.experience) structure += 4;
    if (sections.education) structure += 3;
    if (sections.skills) structure += 3;
    if (sections.projects) structure += 2;
    if (sections.certifications) structure += 1;

    breakdown.structure = structure;

    // --------------------------------------------------------
    // 3. Contact - 10
    // --------------------------------------------------------

    let contactScore = 0;

    if (contact.email) contactScore += 4;
    if (contact.phone) contactScore += 4;

    // LinkedIn is treated as the optional professional profile.
    if (contact.linkedin) {
        contactScore += 2;
    }

    breakdown.contact = Math.min(contactScore, 10);

    // --------------------------------------------------------
    // 4. Experience - 20
    // --------------------------------------------------------

    let experienceScore = 0;

    if (experience.hasExperience) {
        experienceScore += 6;

        if (experience.bulletPoints >= 3) {
            experienceScore += 4;
        }

        if (experience.dateRanges >= 1) {
            experienceScore += 3;
        }

        if (experience.chronological) {
            experienceScore += 3;
        }

        if (experience.quantifiedResults >= 1) {
            experienceScore += 4;
        }
    }

    breakdown.experience = Math.min(
        experienceScore,
        20
    );

    // --------------------------------------------------------
    // 5. Skills - 10
    //
    // We score the existence and structure of the section,
    // NOT particular skills.
    // --------------------------------------------------------

    let skillScore = 0;

    if (skills.hasSection) {
        skillScore += 5;
    }

    if (skills.entries >= 3) {
        skillScore += 3;
    } else if (skills.entries > 0) {
        skillScore += 1;
    }

    if (skills.duplicates === 0 && skills.entries > 0) {
        skillScore += 2;
    }

    breakdown.skills = Math.min(skillScore, 10);

    // --------------------------------------------------------
    // 6. Education + Projects - 10
    // --------------------------------------------------------

    let educationProjects = 0;

    if (education.hasSection) {
        educationProjects += 5;
    }

    if (sections.projects) {
        educationProjects += 5;
    }

    breakdown.educationProjects = educationProjects;

    // --------------------------------------------------------
    // 7. Content - 10
    // --------------------------------------------------------

    let contentScore = 0;

    if (content.words >= 150) {
        contentScore += 3;
    }

    if (content.bulletPoints >= 3) {
        contentScore += 3;
    }

    if (content.quantifiedResults >= 1) {
        contentScore += 4;
    }

    breakdown.content = Math.min(
        contentScore,
        10
    );

    // --------------------------------------------------------
    // 8. ATS Risk - 10
    //
    // Only penalize things we can deterministically observe
    // from extracted text.
    // --------------------------------------------------------

    let atsRisk = 10;

    if (!text.trim()) {
        atsRisk -= 10;
    }

    if (text.includes("�")) {
        atsRisk -= 3;
    }

    if (content.words < 100) {
        atsRisk -= 3;
    }

    if (content.repeatedTerms >= 2) {
        atsRisk -= 2;
    }

    breakdown.atsRisk = Math.max(
        0,
        atsRisk
    );

    // --------------------------------------------------------
    // Final score
    // --------------------------------------------------------

    const total = Object.values(breakdown)
        .reduce((sum, value) => sum + value, 0);

    return {
        total: Math.min(total, 100),
        breakdown
    };
}

function generateSuggestions({
    sections,
    contact,
    skills,
    experience,
    content
}) {
    const suggestions = [];

    if (!contact.email) {
        suggestions.push(
            "Add a professional email address."
        );
    }

    if (!contact.phone) {
        suggestions.push(
            "Add a phone number."
        );
    }

    if (!sections.summary) {
        suggestions.push(
            "Add a concise professional summary."
        );
    }

    if (!sections.experience) {
        suggestions.push(
            "Add a clearly labelled Experience section."
        );
    }

    if (!sections.skills) {
        suggestions.push(
            "Add a clearly labelled Skills section."
        );
    }

    if (!sections.education) {
        suggestions.push(
            "Add an Education section."
        );
    }

    if (
        experience.hasExperience &&
        experience.bulletPoints < 3
    ) {
        suggestions.push(
            "Use concise bullet points to describe experience."
        );
    }

    if (
        experience.hasExperience &&
        experience.quantifiedResults === 0
    ) {
        suggestions.push(
            "Quantify achievements with measurable results where possible."
        );
    }

    if (skills.entries < 3) {
        suggestions.push(
            "Add more skills to the Skills section."
        );
    }

    if (skills.duplicates > 0) {
        suggestions.push(
            "Remove duplicate skills."
        );
    }

    if (content.words < 150) {
        suggestions.push(
            "The resume may be too short. Add more relevant content."
        );
    }

    return suggestions;
}

module.exports = {
    calculateScore,
    generateSuggestions
};
