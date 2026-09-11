const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".txt") {
        return fs.readFileSync(filePath, "utf8");
    }

    if (extension === ".docx") {
        const result = await mammoth.extractRawText({
            path: filePath
        });

        return result.value;
    }

    if (extension === ".pdf") {
        const buffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: buffer
        });

        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    throw new Error(
        "Unsupported file type. Use PDF, DOCX, or TXT."
    );
}

function normalizeText(text) {
    return text
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

module.exports = {
    extractText,
    normalizeText
};
