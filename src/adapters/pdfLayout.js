// Turns a PDF into positioned text items. The only file in the codebase that knows pdfjs exists.

const path = require("node:path");

// pdfjs ships as ESM and this package is CommonJS, so the module is loaded once on first use and cached.
let pdfjsPromise = null;

function loadPdfjs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
    }

    return pdfjsPromise;
}

function standardFontsPath() {
    return `${path.dirname(require.resolve("pdfjs-dist/package.json"))}/standard_fonts/`;
}

// Coordinates stay in PDF user space: origin bottom-left, y increasing upwards, 72 units per inch.
function toItem(raw, order) {
    const [scaleX, , , scaleY, x, y] = raw.transform;

    return {
        order,
        text: raw.str,
        x,
        y,
        width: raw.width,
        height: raw.height || Math.abs(scaleY),
        fontSize: Math.hypot(scaleX, raw.transform[1]) || Math.abs(scaleY),
        fontId: raw.fontName,
        endsLine: Boolean(raw.hasEOL)
    };
}

async function readPages(buffer) {
    const pdfjs = await loadPdfjs();

    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        // Font programs are never rendered here, only measured, so pdfjs is pointed at its bundled metrics rather than fetching any.
        standardFontDataUrl: standardFontsPath(),
        disableFontFace: true,
        isEvalSupported: false
    });

    const document = await loadingTask.promise;

    const pages = [];

    try {
        for (let number = 1; number <= document.numPages; number++) {
            const page = await document.getPage(number);
            const viewport = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();

            let order = 0;

            const items = content.items
                .filter(raw => typeof raw.str === "string" && raw.str.trim() !== "")
                .map(raw => toItem(raw, order++));

            pages.push({
                number,
                width: viewport.width,
                height: viewport.height,
                items
            });

            page.cleanup();
        }
    } finally {
        await loadingTask.destroy();
    }

    return pages;
}

module.exports = { readPages };
