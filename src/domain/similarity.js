// Levenshtein distance over strings or token arrays, and the 0-1 similarity ratio built from it.

function editDistance(a, b) {
    if (a.length === 0 || b.length === 0) {
        return Math.max(a.length, b.length);
    }

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i++) {
        const current = [i];

        for (let j = 1; j <= b.length; j++) {
            current[j] = a[i - 1] === b[j - 1]
                ? previous[j - 1]
                : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]);
        }

        previous = current;
    }

    return previous[b.length];
}

function similarity(a, b) {
    const longest = Math.max(a.length, b.length);

    if (longest === 0) {
        return 1;
    }

    return 1 - (editDistance(a, b) / longest);
}

module.exports = { editDistance, similarity };
