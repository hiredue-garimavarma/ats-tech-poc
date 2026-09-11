# ATS Score Checker — Technical POC

## 1. Overview

This is a simple, deterministic ATS-style resume evaluation POC built with Node.js.

The user provides a PDF, DOCX, or TXT resume through the terminal. The system extracts the text, analyzes resume structure and content, calculates a score out of 100, and displays suggestions.

This is a **resume-only ATS readiness checker**. Job Description matching is not included yet.

---

## 2. Workflow

```text
Resume File
    ↓
Text Extraction
    ↓
Text Normalization
    ↓
Resume Analysis
    ↓
Rule-Based Scoring
    ↓
Score + Breakdown + Suggestions
```

---

## 3. Project Structure

```text
ats-poc/
├── index.js
├── parser.js
├── analyzer.js
├── scorer.js
├── report.js
├── package.json
└── resume files
```

### `index.js`
Main entry point. Connects all stages of the pipeline:

```text
file → parser → analyzer → scorer → report
```

It also handles file validation and errors.

### `parser.js`
Extracts text from:

- PDF using `pdf-parse`
- DOCX using `mammoth`
- TXT using Node.js `fs`

It also normalizes the extracted text.

### `analyzer.js`
Converts the resume text into structured signals.

It detects:

- Resume sections
- Email, phone, and LinkedIn
- Skills count and duplicates
- Experience bullets and dates
- Chronology
- Quantified achievements
- Education
- Projects
- Word count and repeated terms

The analyzer only produces signals; it does not assign scores.

### `scorer.js`
Converts the analyzed signals into a deterministic score out of 100.

It also generates rule-based suggestions.

### `report.js`
Displays the final score, breakdown, detected sections, contact information, content analysis, and suggestions in the terminal.

---

## 4. Scoring

The current score is divided into:

| Category | Points |
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

The score is deterministic, so the same input produces the same result.

### Parseability
Checks whether sufficient machine-readable content was extracted, along with basic contact signals and word count.

### Structure
Checks for common sections such as Summary, Experience, Education, Skills, Projects, and Certifications.

### Contact
Checks:

- Email
- Phone
- LinkedIn

GitHub is not treated as contact information.

### Experience
Checks:

- Experience section
- Bullet count
- Date ranges
- Chronological order
- Quantified results

### Skills
Checks the structure of the Skills section rather than scoring particular technologies.

This avoids hardcoding skills for a specific job when no Job Description is available.

### Education + Projects
Checks whether Education and Projects sections are present.

### Content
Uses word count, bullet count, and quantified results.

### ATS Risk
Uses only observable text-level signals such as very short/empty text, broken characters, and repeated terms.

---

## 5. Design Approach

The POC focuses on **deterministic core rules**.

It does not currently use:

- Job Description matching
- NLP/LLMs
- OCR
- Layout-aware document analysis
- Database or external storage
- Authentication
- ATS integrations

This keeps the first version simple, predictable, and easy to validate.

Some ATS checks such as tables, columns, text boxes, and visual layout require layout-aware document processing and are therefore not claimed by this POC.

---

## 6. Test Results

### Original Resume

```text
ATS SCORE: 89/100
```

The resume was successfully parsed and contained the major sections expected by the analyzer. The main detected content weakness was the absence of quantified achievements in experience bullets.

### Dummy Resume

The dummy resume initially scored:

```text
ATS SCORE: 78/100
```

Testing exposed that the first date pattern did not recognize:

```text
June 2025 – August 2025
```

The date parser was then updated to support month + year ranges.

---

## 7. Current Scope

The current POC demonstrates the basic ATS evaluation pipeline:

```text
Input Resume
     ↓
Parse
     ↓
Normalize
     ↓
Analyze
     ↓
Score
     ↓
Report
```

The next logical extension is adding a Job Description layer for job-specific skill and keyword matching.