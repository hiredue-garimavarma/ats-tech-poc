// Finds the contact details an ATS tries to lift into its candidate record.

// Bare digit runs are not treated as phone numbers: an employee id or an invoice number reads exactly like one, so a match needs a country code, real separators, or a label.
const PHONE_PATTERNS = [
    /\+\d[\d\s().-]{7,15}\d/,
    /\(\d{3}\)\s*\d{3}[\s.-]\d{4}/,
    /\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/,
    /\b\d{5}[\s.-]\d{5}\b/,
    /(?:phone|mobile|tel|telephone|cell|contact)\b[^\n\d]{0,12}(\d[\d\s().-]{7,14}\d)/i
];

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LINKEDIN = /linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+/i;
const GITHUB = /github\.com\/[A-Za-z0-9_-]+/i;
const WEBSITE = /\bhttps?:\/\/[^\s|]+|\b[a-z0-9-]+\.(?:com|dev|io|me|net|org)\/[^\s|]*/i;

function findPhone(text) {
    for (const pattern of PHONE_PATTERNS) {
        const match = text.match(pattern);

        if (match) {
            return (match[1] || match[0]).trim();
        }
    }

    return null;
}

function findContact(text) {
    const linkedin = text.match(LINKEDIN)?.[0] || null;
    const github = text.match(GITHUB)?.[0] || null;

    return {
        email: text.match(EMAIL)?.[0] || null,
        phone: findPhone(text),
        linkedin,
        github,
        // A bare mention of LinkedIn without the profile path gives an ATS nothing to store, and is reported separately from having the link.
        linkedinMentionOnly: linkedin === null && /\blinkedin\b/i.test(text),
        website: linkedin === null && github === null ? (text.match(WEBSITE)?.[0] || null) : null
    };
}

function hasContactDetails(text) {
    return EMAIL.test(text) || LINKEDIN.test(text) || findPhone(text) !== null;
}

module.exports = { findContact, hasContactDetails };
