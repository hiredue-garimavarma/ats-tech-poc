// Turns an analysed resume into a score.
// Nothing here reads the clock or the filesystem: the same analysed resume always produces the same numbers, which is what makes two uploads of one file comparable.

const { SCORE_WEIGHTS, BULLET_MIN_WORDS, BULLET_MAX_WORDS, EMPLOYMENT_GAP_MONTHS } = require("../constants");

function statusOf(earned, weight) {
    if (earned >= weight - 1e-9) {
        return "pass";
    }

    return earned > 0 ? "warn" : "fail";
}

function item(id, label, weight, ratio, detail) {
    const earned = Number((weight * Math.max(0, Math.min(1, ratio))).toFixed(4));

    return { id, label, weight, earned, status: statusOf(earned, weight), detail };
}

function unchecked(id, label, weight, detail) {
    return { id, label, weight, earned: 0, status: "unchecked", detail };
}

// Credit rises linearly to the point where more of the thing stops mattering.
function upTo(value, target) {
    return target === 0 ? 1 : value / target;
}

function total(items) {
    const assessed = items.filter(entry => entry.status !== "unchecked");
    const available = assessed.reduce((sum, entry) => sum + entry.weight, 0);
    const earned = assessed.reduce((sum, entry) => sum + entry.earned, 0);

    return available === 0 ? null : Math.round((earned / available) * 100);
}

function completeness(resume) {
    const { contact, sections } = resume;

    const supporting = ["projects", "certifications", "publications", "awards"]
        .filter(name => sections[name]);

    const items = [
        item("email", "Email address", 15, contact.email ? 1 : 0, contact.email ? `Found ${contact.email}.` : "No email address found."),
        item("phone", "Phone number", 10, contact.phone ? 1 : 0, contact.phone ? `Found ${contact.phone}.` : "No phone number found."),
        item("profileLink", "Profile or portfolio link", 5, (contact.linkedin || contact.github || contact.website) ? 1 : 0, contact.linkedin || contact.github || contact.website || (contact.linkedinMentionOnly ? "LinkedIn is mentioned but the profile URL is missing." : "No LinkedIn, GitHub or portfolio link found.")),
        item("summary", "Summary section", 10, sections.summary ? 1 : 0, sections.summary ? `Found under "${sections.summary.heading}".` : "No summary or profile section found."),
        item("experience", "Experience section", 20, sections.experience ? 1 : 0, sections.experience ? `Found under "${sections.experience.heading}".` : "No experience or employment section found."),
        item("education", "Education section", 15, sections.education ? 1 : 0, sections.education ? `Found under "${sections.education.heading}".` : "No education section found."),
        item("skills", "Skills section", 15, sections.skills ? 1 : 0, sections.skills ? `Found under "${sections.skills.heading}" with ${resume.skills.entries.length} entries.` : "No skills section found."),
        item("supporting", "Projects, certifications or publications", 10, supporting.length > 0 ? 1 : 0, supporting.length > 0 ? `Found ${supporting.join(", ")}.` : "No projects, certifications, publications or awards section found.")
    ];

    return { score: total(items), items };
}

function contentStrength(resume) {
    const stats = resume.bulletStats;
    const line = resume.timeline;

    // A resume written entirely in paragraphs scores zero on the bullet rules rather than skipping them: an ATS summary screen shows bullets, and there are none.
    const quantified = stats.quantifiedShare ?? 0;
    const strong = stats.strongOpenerShare ?? 0;
    const weak = stats.weakOpenerShare ?? 0;
    const wellSized = stats.wellSizedShare ?? 0;

    const items = [
        item("bulletCount", "Achievement bullets present", 15, upTo(stats.count, 6), `${stats.count} bullet points found.`),
        item("quantified", "Bullets with a measured result", 25, upTo(quantified, 0.4), `${Math.round(quantified * 100)}% of bullets contain a number with a unit, currency or percentage.`),
        item("strongOpeners", "Bullets opening with an achievement verb", 20, upTo(strong, 0.6), `${Math.round(strong * 100)}% of bullets open with a verb like built, led or reduced.`),
        item("weakOpeners", "Bullets free of duty phrasing", 10, 1 - upTo(weak, 0.3), `${Math.round(weak * 100)}% of bullets open with phrasing like "Responsible for" or "Worked on".`),
        item("bulletLength", "Bullets in a readable length", 10, upTo(wellSized, 0.8), `${Math.round(wellSized * 100)}% of bullets are ${BULLET_MIN_WORDS} to ${BULLET_MAX_WORDS} words.`),
        item("firstPerson", "No first-person pronouns", 5, stats.firstPersonCount === 0 ? 1 : 0, `${stats.firstPersonCount} bullets use "I" or "my".`),
        item("filler", "No filler phrases", 5, 1 - upTo(stats.fillerCount, 3), `${stats.fillerCount} bullets contain phrases like "team player" or "results-driven".`)
    ];

    items.push(line.reverseChronological === null
        ? unchecked("chronology", "Roles in reverse-chronological order", 5, "No dated roles found in the experience section.")
        : item("chronology", "Roles in reverse-chronological order", 5, line.reverseChronological ? 1 : 0, line.reverseChronological ? "Roles run newest first." : "Roles are not listed newest first."));

    items.push(line.ranges.length === 0
        ? unchecked("gaps", "No unexplained employment gaps", 5, "No dated roles found in the experience section.")
        : item("gaps", "No unexplained employment gaps", 5, 1 - upTo(line.gaps.length, 2), `${line.gaps.length} gaps of ${EMPLOYMENT_GAP_MONTHS} months or more between roles.`));

    return { score: total(items), items };
}

function advisories(resume) {
    const notes = [];

    if (resume.timeline.futureDates > 0) {
        notes.push(`${resume.timeline.futureDates} date range starts in the future, which is usually a typo.`);
    }

    if (resume.timeline.overlaps > 0) {
        notes.push(`${resume.timeline.overlaps} roles overlap in time; make concurrent roles explicit if that is intended.`);
    }

    if (resume.skills.duplicates > 0) {
        notes.push(`${resume.skills.duplicates} duplicate entries in the skills section.`);
    }

    if (resume.contact.linkedinMentionOnly) {
        notes.push("LinkedIn is named without a profile URL, so an ATS has nothing to store.");
    }

    return notes;
}

function scoreResume(resume) {
    const parseHealth = resume.parseRisk.health;
    const complete = completeness(resume);
    const content = contentStrength(resume);

    const quality = Math.round(
        (SCORE_WEIGHTS.completeness * (complete.score ?? 0)) +
        (SCORE_WEIGHTS.contentStrength * (content.score ?? 0))
    );

    // Parse health caps rather than averages: if a machine cannot read the file correctly, how well it is written does not matter.
    const headline = parseHealth === null ? quality : Math.min(quality, parseHealth);

    return {
        headline,
        quality,
        cappedByParseHealth: parseHealth !== null && quality > parseHealth,
        parseHealth,
        completeness: complete,
        contentStrength: content,
        advisories: advisories(resume)
    };
}

module.exports = { scoreResume };
