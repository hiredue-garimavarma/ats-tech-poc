const path = require("path");

function printScore(label, score, maximum) {
    console.log(
        `${label.padEnd(24)} ${score}/${maximum}`
    );
}

function formatLabel(value) {
    return value
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, char => char.toUpperCase());
}

function printReport({
    filePath,
    score,
    sections,
    contact,
    skills,
    experience,
    content,
    suggestions
}) {
    console.log("\n");

    console.log(
        "╔══════════════════════════════════════════╗"
    );
    console.log(
        "║           HIREDUE ATS POC                ║"
    );
    console.log(
        "╚══════════════════════════════════════════╝"
    );

    console.log(
        `\nResume: ${path.basename(filePath)}`
    );

    console.log(
        "\n┌──────────────────────────────────────────┐"
    );
    console.log(
        `│             ATS SCORE: ${score.total}/100              │`
    );
    console.log(
        "└──────────────────────────────────────────┘"
    );

    console.log("\nSCORE BREAKDOWN");
    console.log(
        "────────────────────────────────────────────"
    );

    printScore("Parseability", score.breakdown.parseability, 15);
    printScore("Structure", score.breakdown.structure, 15);
    printScore("Contact", score.breakdown.contact, 10);
    printScore("Experience", score.breakdown.experience, 20);
    printScore("Skills", score.breakdown.skills, 10);
    printScore(
        "Education + Projects",
        score.breakdown.educationProjects,
        10
    );
    printScore("Content", score.breakdown.content, 10);
    printScore("ATS Risk", score.breakdown.atsRisk, 10);

    console.log("\nRESUME STRUCTURE");
    console.log(
        "────────────────────────────────────────────"
    );

    for (const [section, found] of Object.entries(sections)) {
        console.log(
            `${found ? "✓" : "✗"} ${formatLabel(section)}`
        );
    }

    console.log("\nCONTACT INFORMATION");
    console.log(
        "────────────────────────────────────────────"
    );

    console.log(`${contact.email ? "✓" : "✗"} Email`);
    console.log(`${contact.phone ? "✓" : "✗"} Phone`);
    console.log(
        `${contact.linkedin ? "✓" : "✗"} LinkedIn`
    );

    console.log("\nSKILLS ANALYSIS");
    console.log(
        "────────────────────────────────────────────"
    );

    console.log(
        `${skills.hasSection ? "✓" : "✗"} Skills section`
    );

    console.log(`Entries: ${skills.entries}`);
    console.log(`Duplicates: ${skills.duplicates}`);

    console.log("\nCONTENT ANALYSIS");
    console.log(
        "────────────────────────────────────────────"
    );

    console.log(`Words: ${content.words}`);
    console.log(`Bullet points: ${content.bulletPoints}`);
    console.log(
        `Quantified achievements: ${content.quantifiedResults}`
    );

    if (experience.hasExperience) {
        console.log(
            `Experience date ranges: ${experience.dateRanges}`
        );

        console.log(
            `Chronological: ${experience.chronological ? "Yes" : "No"}`
        );
    }

    console.log("\nSUGGESTIONS");
    console.log(
        "────────────────────────────────────────────"
    );

    if (suggestions.length === 0) {
        console.log("✓ No major issues detected.");
    } else {
        suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });
    }

    console.log(
        "\n────────────────────────────────────────────"
    );

    console.log("Analysis complete.\n");
}

module.exports = {
    printReport
};
