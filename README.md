# ATS Resume Scoring POC

A simple Node.js CLI proof of concept for evaluating a resume using deterministic ATS-style rules.

The tool accepts a PDF, DOCX, or TXT resume, extracts its text, analyzes resume structure and content, and generates an ATS readiness score out of 100.

## Features

- PDF, DOCX, and TXT resume parsing
- Resume text normalization
- Section detection
- Contact information detection
- Experience analysis
- Skills section analysis
- Education and project detection
- Content analysis
- Deterministic ATS-style scoring
- Rule-based improvement suggestions
- Terminal-based report

## How It Works

```text
Resume File
    ↓
Text Extraction
    ↓
Text Normalization
    ↓
Resume Analysis
    ↓
ATS Scoring
    ↓
Suggestions
    ↓
Terminal Report
```

## Project Structure

```text
ats-tech-poc/
├── index.js       # CLI entry point
├── parser.js      # PDF/DOCX/TXT text extraction
├── analyzer.js    # Resume signal analysis
├── scorer.js      # ATS scoring rules
├── report.js      # Terminal report
├── dummy_resume.pdf
├── package.json
├── package-lock.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

```bash
node index.js <resume-file>
```

Examples:

```bash
node index.js resume.pdf
node index.js resume.docx
node index.js resume.txt
```

## Demo

Run the POC with the included sample resume:

```bash
node index.js dummy_resume.pdf
```

Example output:

```text
Reading resume...
✓ Resume parsed successfully.


╔══════════════════════════════════════════╗
║           HIREDUE ATS POC                ║
╚══════════════════════════════════════════╝

Resume: dummy_resume.pdf

┌──────────────────────────────────────────┐
│             ATS SCORE: 78/100            │
└──────────────────────────────────────────┘

SCORE BREAKDOWN
────────────────────────────────────────────
Parseability             11/15
Structure                14/15
Contact                   8/10
Experience               13/20
Skills                   10/10
Education + Projects     10/10
Content                   3/10
ATS Risk                  9/10

RESUME STRUCTURE
────────────────────────────────────────────
✓ Summary
✓ Experience
✓ Education
✓ Skills
✓ Projects
✗ Certifications

CONTACT INFORMATION
────────────────────────────────────────────
✓ Email
✓ Phone
✗ LinkedIn

SKILLS ANALYSIS
────────────────────────────────────────────
✓ Skills section
Entries: 10
Duplicates: 0

CONTENT ANALYSIS
────────────────────────────────────────────
Words: 113
Bullet points: 3
Quantified achievements: 0
Experience date ranges: 2
Chronological: Yes

SUGGESTIONS
────────────────────────────────────────────
1. Quantify achievements with measurable results where possible.
2. The resume may be too short. Add more relevant content.

────────────────────────────────────────────
Analysis complete.
```

> **Note:** The demo output above is an example. Exact values may vary if the scoring rules or sample resume are updated.

## Scoring

The resume is evaluated across eight categories:

| Category | Weight |
|---|---:|
| Parseability | 15 |
| Structure | 15 |
| Contact | 10 |
| Experience | 20 |
| Skills | 10 |
| Education + Projects | 10 |
| Content | 10 |
| ATS Risk | 10 |
| **Total** | **100** |

The scoring system is deterministic and rule-based. It does not use a Job Description, NLP, or an LLM.

For example, the Skills score checks whether a Skills section exists, whether it contains enough entries, and whether duplicate skills are detected.

## Suggestions

Suggestions are generated from explicit rules based on the analyzed resume.

For example:

```text
IF quantified achievements = 0
THEN suggest adding measurable results
```

This makes the scoring and recommendations explainable and reproducible.

## Why Deterministic Rules?

The POC uses explicit, explainable rules rather than an LLM.

For example:

- Missing Skills section → lower structure score
- No quantified achievements → improvement suggestion
- Missing contact information → lower contact score
- Duplicate skills → improvement suggestion

This makes the scoring reproducible and easy to validate before introducing more advanced NLP or Job Description matching.

## Current Scope

This is a technical POC focused on **resume-only ATS readiness**.

It does not currently include:

- Job Description matching
- Keyword relevance scoring against a JD
- NLP/LLM analysis
- OCR
- Database or API integration
- Authentication
- UI

These can be added as future layers once the deterministic resume analysis is validated.

## Tech Stack

- Node.js
- JavaScript
- `pdf-parse`
- `mammoth`

## Disclaimer

This POC provides a deterministic ATS-style resume evaluation. It is not intended to reproduce the proprietary scoring systems of specific ATS platforms.
