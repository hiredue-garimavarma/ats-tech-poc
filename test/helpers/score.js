// Scores a resume from memory so tests can state their input inline instead of keeping a file per case.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { readDocument } = require("../../src/adapters/document");
const { analyseResume } = require("../../src/domain/resume");
const { scoreResume } = require("../../src/domain/score");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ats-test-"));

let counter = 0;

async function scoreFile(filePath, options = {}) {
    const document = await readDocument(filePath);
    const resume = analyseResume(document, options);

    return { resume, score: scoreResume(resume) };
}

async function scoreAs(extension, contents, options = {}) {
    const filePath = path.join(directory, `case-${counter++}${extension}`);
    fs.writeFileSync(filePath, contents);

    return scoreFile(filePath, options);
}

const scoreText = (text, options) => scoreAs(".txt", text, options);
const scorePdf = (buffer, options) => scoreAs(".pdf", buffer, options);

module.exports = { scoreFile, scoreText, scorePdf };
