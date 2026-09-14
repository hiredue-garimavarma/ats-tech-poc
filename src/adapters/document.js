// Reads a resume file into text plus, where the format has one, page geometry.

const fs = require("node:fs");
const path = require("node:path");

const { readPages } = require("./pdfLayout");
const { linesFromItems, textFromLines } = require("../domain/lines");

// DOCX and TXT carry no page geometry we can inspect: mammoth flattens tables and columns before we ever see them, so those checks are reported as unchecked rather than passed.
const GEOMETRY_FORMATS = new Set([".pdf"]);

function normalize(text) {
    return text
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

async function readDocument(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".txt") {
        return {
            format: "txt",
            hasGeometry: false,
            pages: [],
            text: normalize(fs.readFileSync(filePath, "utf8"))
        };
    }

    if (extension === ".docx") {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ path: filePath });

        return {
            format: "docx",
            hasGeometry: false,
            pages: [],
            text: normalize(result.value)
        };
    }

    if (extension === ".pdf") {
        const pages = await readPages(fs.readFileSync(filePath));

        // Text is rebuilt from geometric reading order, not from stream order, so a scrambled PDF is analysed the way it looks rather than the way it was written.
        const text = pages
            .map(page => textFromLines(linesFromItems(page.items)))
            .join("\n\n");

        return {
            format: "pdf",
            hasGeometry: GEOMETRY_FORMATS.has(extension),
            pages,
            text: normalize(text)
        };
    }

    throw new Error(`Unsupported file type "${extension}". Use PDF, DOCX, or TXT.`);
}

module.exports = { readDocument };
