// Every tunable the scoring pipeline reads. Each value carries the observation that produced it.

module.exports = {
    // A page with less extractable text than this is a scan or an image-only export, not a text layer.
    MIN_CHARS_PER_PAGE: 100,

    // US Letter is 792pt tall; 6% is 47pt, which covers the header and footer margins Word and Google Docs default to.
    PAGE_MARGIN_BAND_RATIO: 0.06,

    // Two-column resumes put a gutter of at least 24pt (0.33in) between columns; narrower gaps are word spacing inside one column.
    GUTTER_MIN_WIDTH_RATIO: 0.04,

    // A gutter outside this band of the text width is a hanging indent or a right-aligned date, not a column split.
    GUTTER_ZONE: [0.2, 0.8],

    // Below this share of items on the thinner side, the "column" is a date rail or a page number, not a content column.
    COLUMN_MIN_ITEM_SHARE: 0.15,

    // A real column runs most of the page; a two-up skills list occupies a band and must not be flagged.
    COLUMN_MIN_HEIGHT_SHARE: 0.5,

    // Text baselines within 40% of a line's font size belong to the same visual line, including superscripts and mixed sizes.
    LINE_BASELINE_TOLERANCE_RATIO: 0.4,

    // Below this token-level agreement between stream order and geometric order, two parsers will disagree about what the resume says.
    READING_ORDER_SAFE_DIVERGENCE: 0.05,
    READING_ORDER_SEVERE_DIVERGENCE: 0.2,

    // Levenshtein similarity at which a header line is accepted as a known section, tuned to catch "EXPERENCE" but reject "EXPERTISE" against "EXPERIENCE".
    HEADER_FUZZY_MIN_RATIO: 0.85,

    // Section headers are labels; past six words the line is a sentence.
    HEADER_MAX_WORDS: 6,

    // A line this much larger than the document's body font size is typographically a heading.
    HEADER_FONT_SIZE_RATIO: 1.08,

    // Bullets shorter than this read as fragments, longer than this read as paragraphs and get skimmed past.
    BULLET_MIN_WORDS: 8,
    BULLET_MAX_WORDS: 25,

    // A break longer than two quarters is the gap a recruiter asks about; shorter ones are normal notice periods.
    EMPLOYMENT_GAP_MONTHS: 6,

    // Private Use Area codepoints leak into extracted text when a font ships without a ToUnicode map, which is what produces mojibake in an ATS.
    PRIVATE_USE_AREA: [0xe000, 0xf8ff],

    // Extraction that loses the space glyph yields runs like "SeniorEngineerAcme"; real English resume tokens stay well under this.
    MAX_MEDIAN_TOKEN_LENGTH: 15,

    // Parse health caps the headline score, so these weights only distribute the remainder between the two quality dimensions.
    SCORE_WEIGHTS: {
        completeness: 0.45,
        contentStrength: 0.55
    }
};
