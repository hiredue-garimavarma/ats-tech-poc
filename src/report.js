// Renders a scored resume as a terminal report.

const MARK = { pass: "✓", warn: "!", fail: "✗", unchecked: "?" };

const WIDTH = 62;

function rule() {
    return "─".repeat(WIDTH);
}

function box(label) {
    const inner = label.padStart(Math.floor((WIDTH - 2 + label.length) / 2)).padEnd(WIDTH - 2);

    return [`┌${"─".repeat(WIDTH - 2)}┐`, `│${inner}│`, `└${"─".repeat(WIDTH - 2)}┘`].join("\n");
}

function bar(value) {
    if (value === null) {
        return "not assessable";
    }

    const filled = Math.round(value / 5);

    return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${String(value).padStart(3)}`;
}

function findingLines(items) {
    return items
        .map(entry => `  ${MARK[entry.status]} ${entry.label ?? entry.id}\n      ${entry.detail}`)
        .join("\n");
}

// The report leads with what to change, because a score nobody can act on is a number for its own sake.
function fixes(score) {
    const losses = [...score.completeness.items, ...score.contentStrength.items]
        .filter(entry => entry.status === "fail" || entry.status === "warn")
        .map(entry => ({ label: entry.label, lost: entry.weight - entry.earned, detail: entry.detail }))
        .sort((a, b) => (b.lost - a.lost) || a.label.localeCompare(b.label))
        .slice(0, 5);

    return losses;
}

function printReport({ filePath, resume, score }) {
    const out = [];

    out.push("");
    out.push(box(`ATS READINESS  ${score.headline}/100`));
    out.push(`  ${filePath}  ·  ${resume.format.toUpperCase()}  ·  ${resume.wordCount} words`);
    out.push("");
    out.push(`  Parse health      ${bar(score.parseHealth)}`);
    out.push(`  Completeness      ${bar(score.completeness.score)}`);
    out.push(`  Content strength  ${bar(score.contentStrength.score)}`);

    if (score.cappedByParseHealth) {
        out.push("");
        out.push(`  Written quality scores ${score.quality}, but the headline is capped at parse health:`);
        out.push("  an ATS cannot read this file correctly, so the writing never gets seen.");
    }

    out.push("");
    out.push(`PARSE RISK   ${resume.parseRisk.checksRun} of ${resume.parseRisk.checksTotal} checks ran`);
    out.push(rule());
    out.push(findingLines(resume.parseRisk.findings));

    out.push("");
    out.push("COMPLETENESS");
    out.push(rule());
    out.push(findingLines(score.completeness.items));

    out.push("");
    out.push("CONTENT STRENGTH");
    out.push(rule());
    out.push(findingLines(score.contentStrength.items));

    const ranked = fixes(score);

    if (ranked.length > 0) {
        out.push("");
        out.push("HIGHEST-VALUE FIXES");
        out.push(rule());

        ranked.forEach((fix, index) => {
            out.push(`  ${index + 1}. ${fix.label}  (+${fix.lost.toFixed(1)} points available)`);
        });
    }

    if (score.advisories.length > 0) {
        out.push("");
        out.push("NOTES  (not scored)");
        out.push(rule());
        score.advisories.forEach(note => out.push(`  · ${note}`));
    }

    out.push("");

    console.log(out.join("\n"));
}

module.exports = { printReport };
