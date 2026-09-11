const fs = require("fs");

const {
    extractText,
    normalizeText
} = require("./parser");

const {
    analyzeResume
} = require("./analyzer");

const {
    calculateScore,
    generateSuggestions
} = require("./scorer");

const {
    printReport
} = require("./report");

async function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.log(`
Usage:
  node index.js <resume-file>

Examples:
  node index.js resume.pdf
  node index.js resume.docx
  node index.js resume.txt
`);

        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(
            `\nFile not found: ${filePath}\n`
        );

        process.exit(1);
    }

    try {
        console.log("\nReading resume...");

        // 1. Extract text from the document
        const rawText = await extractText(filePath);

        if (!rawText || !rawText.trim()) {
            throw new Error(
                "No readable text could be extracted."
            );
        }

        console.log(
            "✓ Resume parsed successfully."
        );

        // 2. Normalize extracted text
        const text = normalizeText(rawText);

        // 3. Analyze the resume
        const analysis = analyzeResume(text);

        // 4. Calculate ATS score
        const score = calculateScore({
            text,
            ...analysis
        });

        // 5. Generate recommendations
        const suggestions =
            generateSuggestions(analysis);

        // 6. Display the final report
        printReport({
            filePath,
            score,
            ...analysis,
            suggestions
        });

    } catch (error) {
        console.error(
            `\nError: ${error.message}\n`
        );

        process.exit(1);
    }
}

main();
