#!/usr/bin/env node

/**
 * Generate PNG icons from the SVG source for the PWA manifest.
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Requires: sharp (install with `npm i -D sharp`)
 *
 * If sharp is not installed the script exits with a helpful message
 * instead of crashing mid-build.
 */

const fs = require("fs");
const path = require("path");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_PATH = path.join(__dirname, "..", "public", "icons", "icon.svg");
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error(
      "sharp is not installed. Run:\n  npm i -D sharp\nThen re-run this script."
    );
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const size of SIZES) {
    const outFile = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outFile);
    console.log(`  Created ${outFile}`);
  }

  console.log("\nDone — all PWA icons generated.");
}

main();
