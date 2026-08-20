import { assetBaseHref, withAssetBase } from "./slides.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Path separators survive; only the segments are encoded. A whole-path
// encodeURIComponent would collapse this into one segment and break relative
// resolution — that's the bug this shape exists to avoid.
equal(assetBaseHref("/Users/g/My Base/docs"), "marklyfile://localhost/Users/g/My%20Base/docs/");
equal(assetBaseHref("/v/한글 폴더"), "marklyfile://localhost/v/%ED%95%9C%EA%B8%80%20%ED%8F%B4%EB%8D%94/");
equal(assetBaseHref("/"), "marklyfile://localhost/");

// A relative reference resolves against the directory, not the origin root.
equal(
  new URL("./support.js", assetBaseHref("/Users/g/deck")).href,
  "marklyfile://localhost/Users/g/deck/support.js",
);
equal(
  new URL("_ds/styles.css", assetBaseHref("/Users/g/deck")).href,
  "marklyfile://localhost/Users/g/deck/_ds/styles.css",
);

const head = withAssetBase("<html><head><title>t</title></head><body>x</body></html>", "/d");
equal(head.indexOf("<base") < head.indexOf("<title"), true);

// No <head>, and no <html> either — still gets one.
equal(withAssetBase("<body>x</body>", "/d").startsWith("<head><base"), true);
equal(withAssetBase("<html><body>x</body></html>", "/d").includes("<head><base"), true);

// An author-supplied <base> is left alone.
const authored = '<html><head><base href="https://x/"></head></html>';
equal(withAssetBase(authored, "/d"), authored);

console.log("slides tests passed");
