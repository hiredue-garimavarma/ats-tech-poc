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
