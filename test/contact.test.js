const test = require("node:test");
const assert = require("node:assert/strict");

const { findContact } = require("../src/domain/contact");

// The old detector matched any long digit run, so a resume with no phone number still reported one.
test("a bare digit run is not reported as a phone number", () => {
    assert.equal(findContact("Bob Roberts\nbob@x.com\nEmployee ID 1002003004\nAcme 2019 - 2023\n").phone, null);
});

test("phone numbers are found in the formats candidates actually write them in", () => {
    const cases = [["+91 9876543210", "+91 9876543210"], ["(415) 555-0199", "(415) 555-0199"], ["415-555-0199", "415-555-0199"], ["98765 43210", "98765 43210"], ["Mobile: 9876543210", "9876543210"]];

    for (const [input, expected] of cases) {
        assert.equal(findContact(`Jane Smith\n${input}\njane@corp.com`).phone, expected);
    }
});

// A named LinkedIn with no URL gives an ATS nothing to store, and is a different finding from having no profile at all.
test("naming LinkedIn without the profile URL is reported separately from having the link", () => {
    const named = findContact("Jane Smith | jane@corp.com | LinkedIn");

    assert.equal(named.linkedin, null);
    assert.equal(named.linkedinMentionOnly, true);

    const linked = findContact("Jane Smith | jane@corp.com | linkedin.com/in/janesmith");

    assert.equal(linked.linkedin, "linkedin.com/in/janesmith");
    assert.equal(linked.linkedinMentionOnly, false);
});
