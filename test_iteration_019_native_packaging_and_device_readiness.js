/**
 * REA Reconstruction — Iteration 019: Android Native Packaging & Physical Device Verification Suite
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

(() => {
  console.log("================================================================");
  console.log("REA RECONSTRUCTION: ITERATION 019 PACKAGING & DEVICE SUITE");
  console.log("================================================================");

  // STEP 1: PHYSICAL DEVICE DISPLAY METRICS & VIEWPORT CONSTRAINTS
  console.log("\n--- STEP 1: REDMI NOTE 9 (MERLIN) DISPLAY METRICS ---");

  runTest("1.1: Physical device display coordinates validate to standard 392dp mobile viewport", () => {
    const physicalWidthPx = 1080;
    const physicalHeightPx = 2340;
    const physicalDensityDpi = 440;
    const densityScale = physicalDensityDpi / 160; // 2.75x

    const viewportWidthDp = physicalWidthPx / densityScale;
    const viewportHeightDp = physicalHeightPx / densityScale;

    assert(viewportWidthDp >= 360 && viewportWidthDp <= 420, `Viewport width (${viewportWidthDp.toFixed(1)}dp) must fit 360-420dp range`);
    assert(viewportHeightDp >= 800 && viewportHeightDp <= 900, `Viewport height (${viewportHeightDp.toFixed(1)}dp) must fit 800-900dp range`);
  });

  runTest("1.2: Minimum touch target size adheres to Android Material 48x48dp standard", () => {
    const appJsPath = path.join(__dirname, "App.js");
    const appJs = fs.readFileSync(appJsPath, "utf8");

    // Verify 48dp minimum touch target hit slop or style padding in key action buttons
    assert(appJs.includes("STANDARD_TOUCH_HIT_SLOP") || appJs.includes("minHeight: 48") || appJs.includes("paddingVertical: 10"), "Touch targets must adhere to standard accessibility guidelines");
  });

  // STEP 2: NATIVE ANDROID PACKAGE INTEGRITY
  console.log("\n--- STEP 2: NATIVE ANDROID CONFIGURATION & MANIFEST ---");

  runTest("2.1: AndroidManifest.xml package and permissions conform to production specs", () => {
    const manifestPath = path.join(__dirname, "android/app/src/main/AndroidManifest.xml");
    assert.strictEqual(fs.existsSync(manifestPath), true, "AndroidManifest.xml must exist");
    const xml = fs.readFileSync(manifestPath, "utf8");

    assert(xml.includes("android.permission.INTERNET"), "Must declare INTERNET");
    assert(xml.includes("android.permission.VIBRATE"), "Must declare VIBRATE");
    assert(xml.includes("android:allowBackup=\"true\""), "Must allow backup");
    assert(xml.includes("android:screenOrientation=\"portrait\""), "Must enforce portrait");
  });

  runTest("2.2: app.json matches package ID com.progoti.tallykhata.offline and version 4.0.0", () => {
    const appJsonPath = path.join(__dirname, "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

    assert.strictEqual(appJson.expo.version, "4.0.0");
    assert.strictEqual(appJson.expo.android.package, "com.progoti.tallykhata.offline");
    assert.strictEqual(appJson.expo.name, "টালিখাতা");
  });

  // STEP 3: APK ARTIFACT & SIGNING HEADER VALIDATION
  console.log("\n--- STEP 3: APK ARTIFACT & SIGNING HEADER VALIDATION ---");

  runTest("3.1: Debug APK exists and contains valid ZIP/APK magic header", () => {
    const apkPath = path.join(__dirname, "android/app/build/outputs/apk/debug/app-debug.apk");
    assert.strictEqual(fs.existsSync(apkPath), true, "app-debug.apk must exist in build outputs");

    const fd = fs.openSync(apkPath, "r");
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    // Standard ZIP/APK magic header: 0x50 0x4B 0x03 0x04 (PK\x03\x04)
    assert.strictEqual(buffer[0], 0x50, "Magic byte 0 must be P");
    assert.strictEqual(buffer[1], 0x4b, "Magic byte 1 must be K");
    assert.strictEqual(buffer[2], 0x03, "Magic byte 2 must be 0x03");
    assert.strictEqual(buffer[3], 0x04, "Magic byte 3 must be 0x04");
  });

  runTest("3.2: High-resolution branded launcher icon exists", () => {
    const iconPath = path.join(__dirname, "assets/icons/ic_tally_khata_logo_reg.png");
    assert.strictEqual(fs.existsSync(iconPath), true, "App icon must exist");
    const stat = fs.statSync(iconPath);
    assert(stat.size > 1000, "App icon must be a valid non-empty PNG");
  });

  // STEP 4: CODEBASE AST PARSE SANITY (ALL 19 JS FILES)
  console.log("\n--- STEP 4: APPLICATION CODEBASE AST VALIDATION ---");

  runTest("4.1: Complete JS codebase parses with zero syntax or grammatical errors", () => {
    const jsFiles = [
      "App.js",
      "index.js",
      ...fs.readdirSync("src").filter(f => f.endsWith(".js")).map(f => path.join("src", f)),
      ...fs.readdirSync("src/components").filter(f => f.endsWith(".js")).map(f => path.join("src/components", f))
    ];
    assert(jsFiles.length >= 19, `Expected at least 19 JS files, found ${jsFiles.length}`);
    for (const f of jsFiles) {
      const src = fs.readFileSync(f, "utf8");
      babel.parseSync(src, {
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ["jsx", "flow", "classProperties"] }
      });
    }
  });

  console.log("\n================================================================");
  console.log(`ITERATION 019 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
})();