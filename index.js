const fs = require("node:fs");

const { readDocument } = require("./src/adapters/document");
const { analyseResume } = require("./src/domain/resume");
const { scoreResume } = require("./src/domain/score");
const { printReport } = require("./src/report");

const USAGE = `
Usage:
  node index.js <resume-file> [--json]

Examples:
  node index.js resume.pdf
  node index.js resume.docx --json
`;

async function main() {
    const args = process.argv.slice(2);
    const filePath = args.find(arg => !arg.startsWith("--"));
    const asJson = args.includes("--json");

    if (!filePath) {
        console.log(USAGE);
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`\nFile not found: ${filePath}\n`);
        process.exit(1);
    }

    try {
        const document = await readDocument(filePath);
        const resume = analyseResume(document);
        const score = scoreResume(resume);

        if (asJson) {
            console.log(JSON.stringify({ file: filePath, format: resume.format, score, parseRisk: resume.parseRisk }, null, 2));
            return;
        }

        printReport({ filePath, resume, score });
    } catch (error) {
        console.error(`\nError: ${error.message}\n`);
        process.exit(1);
    }
}

main();
